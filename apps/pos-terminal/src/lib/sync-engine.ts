import {
  PosSyncBatchResponseSchema,
  type PosLineItem,
  type PosMutation,
} from '@ziro/shared-types';
import type { PosCatalogRow, PosConflictRow, PosStorageAdapter } from './db';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}

export class InMemoryPosStorage implements PosStorageAdapter {
  private catalog = new Map<string, PosCatalogRow>();
  private queue = new Map<string, PosMutation>();
  private conflicts = new Map<string, PosConflictRow>();

  constructor(initialCatalog?: PosCatalogRow[]) {
    if (initialCatalog) {
      for (const item of initialCatalog) {
        this.catalog.set(item.sku, { ...item });
      }
    }
  }

  async getCatalogItem(sku: string): Promise<PosCatalogRow | undefined> {
    const row = this.catalog.get(sku);
    return row ? { ...row } : undefined;
  }

  async upsertCatalogItem(item: PosCatalogRow): Promise<void> {
    this.catalog.set(item.sku, { ...item });
  }

  async listCatalog(): Promise<PosCatalogRow[]> {
    return Array.from(this.catalog.values()).map((r) => ({ ...r }));
  }

  async enqueueMutation(mutation: PosMutation): Promise<void> {
    this.queue.set(mutation.client_mutation_id, { ...mutation });
  }

  async listPendingMutations(): Promise<PosMutation[]> {
    return Array.from(this.queue.values()).map((m) => ({ ...m }));
  }

  async removeMutation(clientMutationId: string): Promise<void> {
    this.queue.delete(clientMutationId);
  }

  async addConflict(conflict: PosConflictRow): Promise<void> {
    this.conflicts.set(conflict.conflict_id, { ...conflict });
  }

  async listConflicts(): Promise<PosConflictRow[]> {
    return Array.from(this.conflicts.values()).map((c) => ({ ...c }));
  }

  async getConflict(conflictId: string): Promise<PosConflictRow | undefined> {
    const c = this.conflicts.get(conflictId);
    return c ? { ...c } : undefined;
  }

  async removeConflict(conflictId: string): Promise<void> {
    this.conflicts.delete(conflictId);
  }
}

export interface PosSyncEngineOptions {
  storage: PosStorageAdapter;
  deviceId: string;
  locationId: string;
  apiBaseUrl: string;
  isOnline?: () => boolean;
  fetchImpl?: typeof fetch;
}

export class PosSyncEngine {
  private storage: PosStorageAdapter;
  private deviceId: string;
  private locationId: string;
  private apiBaseUrl: string;
  private isOnline: () => boolean;
  private fetchImpl: typeof fetch;

  constructor(options: PosSyncEngineOptions) {
    this.storage = options.storage;
    this.deviceId = options.deviceId;
    this.locationId = options.locationId;
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
    this.isOnline =
      options.isOnline ??
      (() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async queueSale(params: {
    items: PosLineItem[];
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'NET30';
  }): Promise<PosMutation> {
    const firstSku = params.items[0]?.sku ?? '';
    const catalogItem = await this.storage.getCatalogItem(firstSku);
    const mutation: PosMutation = {
      client_mutation_id: randomId(),
      mutation_type: 'POS_SALE',
      timestamp: new Date().toISOString(),
      expected_version: catalogItem?.version ?? 1,
      line_items: params.items,
      payment_method: params.payment_method,
    };
    await this.storage.enqueueMutation(mutation);
    return mutation;
  }

  async queueStockAudit(params: {
    sku: string;
    counted_qty: number;
    audit_mode: 'ABSOLUTE' | 'DELTA';
  }): Promise<PosMutation> {
    const catalogItem = await this.storage.getCatalogItem(params.sku);
    const mutation: PosMutation = {
      client_mutation_id: randomId(),
      mutation_type: 'STOCK_AUDIT',
      audit_mode: params.audit_mode,
      timestamp: new Date().toISOString(),
      expected_version: catalogItem?.version ?? 1,
      line_items: [
        {
          sku: params.sku,
          qty: params.counted_qty,
          unit_price_minor: catalogItem?.price_minor ?? 0,
        },
      ],
      payment_method: 'NONE',
    };
    await this.storage.enqueueMutation(mutation);
    return mutation;
  }

  async flushPendingMutations(): Promise<{
    flushed: number;
    conflicts: number;
    applied: number;
  }> {
    if (!this.isOnline()) {
      return { flushed: 0, conflicts: 0, applied: 0 };
    }

    const pending = await this.storage.listPendingMutations();
    if (pending.length === 0) {
      return { flushed: 0, conflicts: 0, applied: 0 };
    }

    const resp = await this.fetchImpl(`${this.apiBaseUrl}/store/pos/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        device_id: this.deviceId,
        location_id: this.locationId,
        mutations: pending,
      }),
    });

    if (!resp.ok) {
      throw new Error(`POS sync failed with HTTP ${resp.status}`);
    }

    const parsed = PosSyncBatchResponseSchema.parse(await resp.json());
    const byId = new Map(pending.map((m) => [m.client_mutation_id, m]));

    let appliedCount = 0;
    let conflictCount = 0;

    for (const inv of parsed.current_inventory) {
      const existing = await this.storage.getCatalogItem(inv.sku);
      await this.storage.upsertCatalogItem({
        sku: inv.sku,
        title: existing?.title ?? inv.sku,
        barcode: existing?.barcode,
        price_minor: existing?.price_minor ?? 0,
        on_hand: inv.on_hand,
        version: inv.version,
      });
    }

    for (const result of parsed.results) {
      const mutation = byId.get(result.client_mutation_id);
      if (!mutation) continue;

      if (
        result.status === 'APPLIED' ||
        result.status === 'APPLIED_WITH_ALERT' ||
        result.status === 'DUPLICATE'
      ) {
        appliedCount += 1;
        await this.storage.removeMutation(result.client_mutation_id);
      } else if (result.status === 'CONFLICT') {
        conflictCount += 1;
        await this.storage.removeMutation(result.client_mutation_id);
        await this.storage.addConflict({
          conflict_id: `conf_${randomId().slice(0, 8)}`,
          client_mutation_id: result.client_mutation_id,
          mutation,
          server_version: result.server_version ?? 1,
          server_balance: result.server_balance ?? 0,
          message: result.message ?? 'Version conflict during POS sync',
          detected_at: new Date().toISOString(),
        });
      }
    }

    return {
      flushed: pending.length,
      conflicts: conflictCount,
      applied: appliedCount,
    };
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'accept_server' | 'force_override' | 'void',
  ): Promise<void> {
    const conflict = await this.storage.getConflict(conflictId);
    if (!conflict) return;

    const sku = conflict.mutation.line_items[0]?.sku;
    if (resolution === 'accept_server' && sku) {
      const existing = await this.storage.getCatalogItem(sku);
      await this.storage.upsertCatalogItem({
        sku,
        title: existing?.title ?? sku,
        barcode: existing?.barcode,
        price_minor: existing?.price_minor ?? 0,
        on_hand: conflict.server_balance,
        version: conflict.server_version,
      });
    } else if (resolution === 'force_override') {
      const reQueued: PosMutation = {
        ...conflict.mutation,
        client_mutation_id: randomId(),
        expected_version: conflict.server_version,
        timestamp: new Date().toISOString(),
      };
      await this.storage.enqueueMutation(reQueued);
    }

    await this.storage.removeConflict(conflictId);
  }
}
