import crypto from 'node:crypto';
import type {
  PosConflictPolicy,
  PosSyncBatchRequest,
  PosSyncBatchResponse,
  PosSyncMutationResult,
} from '@ziro/shared-types';
import type { FitmentBomService, InMemoryFitmentBomStore } from '@ziro/rails';

export interface CatalogItemState {
  tenant_id: string;
  location_id: string;
  sku: string;
  product_id: string;
  title: string;
  price_minor: number;
  cogs_minor?: number;
  on_hand: number;
  version: number;
}

export interface ReconciliationAlertRecord {
  alert_id: string;
  tenant_id: string;
  location_id: string;
  device_id: string;
  client_mutation_id: string;
  sku: string;
  expected_version: number;
  server_version: number;
  delta_qty: number;
  created_at: string;
}

export class PosSyncService {
  private catalog = new Map<string, CatalogItemState>();
  private processedMutations = new Set<string>();
  private alerts: ReconciliationAlertRecord[] = [];
  private bomStore?: InMemoryFitmentBomStore;
  private fitmentBomService?: FitmentBomService;

  constructor(options?: {
    initialCatalog?: CatalogItemState[];
    bomStore?: InMemoryFitmentBomStore;
    fitmentBomService?: FitmentBomService;
  }) {
    this.bomStore = options?.bomStore;
    this.fitmentBomService = options?.fitmentBomService;
    if (options?.initialCatalog) {
      for (const item of options.initialCatalog) {
        this.catalog.set(this.itemKey(item.tenant_id, item.location_id, item.sku), { ...item });
      }
    }
  }

  private itemKey(tenantId: string, locationId: string, sku: string): string {
    return `${tenantId}:${locationId}:${sku}`;
  }

  private mutationKey(tenantId: string, deviceId: string, clientMutationId: string): string {
    return `${tenantId}:${deviceId}:${clientMutationId}`;
  }

  getReconciliationAlerts(tenantId: string): ReconciliationAlertRecord[] {
    return this.alerts.filter((a) => a.tenant_id === tenantId);
  }

  getCatalogItem(tenantId: string, locationId: string, sku: string): CatalogItemState | undefined {
    return this.catalog.get(this.itemKey(tenantId, locationId, sku));
  }

  findProductAcrossLocations(tenantId: string, productId: string): CatalogItemState | undefined {
    for (const item of this.catalog.values()) {
      if (item.tenant_id === tenantId && item.product_id === productId) {
        return item;
      }
    }
    return undefined;
  }

  getCatalogDelta(tenantId: string, locationId: string | undefined, sinceVersion: number): CatalogItemState[] {
    const items: CatalogItemState[] = [];
    for (const item of this.catalog.values()) {
      if (item.tenant_id !== tenantId) continue;
      if (locationId && item.location_id !== locationId) continue;
      if (item.version > sinceVersion) {
        items.push({ ...item });
      }
    }
    return items.sort((a, b) => a.version - b.version);
  }

  async syncBatch(
    tenantId: string,
    policy: PosConflictPolicy,
    request: PosSyncBatchRequest,
  ): Promise<PosSyncBatchResponse> {
    const results: PosSyncMutationResult[] = [];
    let maxServerVersion = 0;

    for (const mutation of request.mutations) {
      const mKey = this.mutationKey(tenantId, request.device_id, mutation.client_mutation_id);
      if (this.processedMutations.has(mKey)) {
        const firstSku = mutation.line_items[0]?.sku ?? '';
        const existing = this.catalog.get(this.itemKey(tenantId, request.location_id, firstSku));
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'DUPLICATE',
          reconciled_deltas: [],
          server_version: existing?.version ?? 1,
          server_balance: existing?.on_hand ?? 0,
        });
        continue;
      }

      const primaryItem = mutation.line_items[0];
      if (!primaryItem) {
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'CONFLICT',
          reconciled_deltas: [],
          server_version: 0,
          server_balance: 0,
          message: 'Mutation contained no line_items',
        });
        continue;
      }

      const state = this.catalog.get(this.itemKey(tenantId, request.location_id, primaryItem.sku));
      if (!state) {
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'CONFLICT',
          reconciled_deltas: [],
          server_version: 0,
          server_balance: 0,
          message: `SKU '${primaryItem.sku}' not found at location '${request.location_id}'`,
        });
        continue;
      }

      const versionMismatch = mutation.expected_version !== state.version;

      if (versionMismatch && (policy === 'STRICT_REJECT' || mutation.mutation_type === 'STOCK_AUDIT')) {
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'CONFLICT',
          reconciled_deltas: [],
          server_version: state.version,
          server_balance: state.on_hand,
          message: `Version conflict: expected ${mutation.expected_version}, server is ${state.version}`,
        });
        continue;
      }

      let signedDelta = 0;
      if (mutation.mutation_type === 'POS_SALE') {
        signedDelta = -primaryItem.qty;
        if (this.bomStore && this.fitmentBomService) {
          const bom = this.bomStore.getBom(tenantId, primaryItem.sku);
          if (bom) {
            await this.fitmentBomService.deductBomStock(tenantId, [
              { sku: primaryItem.sku, quantity: primaryItem.qty },
            ]);
          }
        }
      } else if (mutation.mutation_type === 'RETURN') {
        signedDelta = primaryItem.qty;
      } else if (mutation.mutation_type === 'STOCK_AUDIT') {
        if (mutation.audit_mode === 'ABSOLUTE') {
          signedDelta = primaryItem.qty - state.on_hand;
        } else {
          signedDelta = primaryItem.qty;
        }
      }

      state.on_hand = state.on_hand + signedDelta;
      state.version += 1;
      if (state.version > maxServerVersion) {
        maxServerVersion = state.version;
      }

      this.processedMutations.add(mKey);

      const reconciledDeltas = [
        {
          sku: primaryItem.sku,
          delta: signedDelta,
          balance_after: state.on_hand,
          version_after: state.version,
        },
      ];

      if (versionMismatch && policy === 'FORCE_SALE_WITH_ALERT') {
        this.alerts.push({
          alert_id: `alt_${crypto.randomUUID().slice(0, 8)}`,
          tenant_id: tenantId,
          location_id: request.location_id,
          device_id: request.device_id,
          client_mutation_id: mutation.client_mutation_id,
          sku: primaryItem.sku,
          expected_version: mutation.expected_version,
          server_version: state.version,
          delta_qty: signedDelta,
          created_at: new Date().toISOString(),
        });
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'APPLIED_WITH_ALERT',
          reconciled_deltas: reconciledDeltas,
          server_version: state.version,
          server_balance: state.on_hand,
        });
      } else {
        results.push({
          client_mutation_id: mutation.client_mutation_id,
          status: 'APPLIED',
          reconciled_deltas: reconciledDeltas,
          server_version: state.version,
          server_balance: state.on_hand,
        });
      }
    }

    const currentInventory = this.getCatalogDelta(tenantId, request.location_id, 0).map((item) => ({
      sku: item.sku,
      on_hand: item.on_hand,
      reserved: 0,
      version: item.version,
    }));

    return {
      location_id: request.location_id,
      results,
      current_inventory: currentInventory,
    };
  }
}
