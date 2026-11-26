import Dexie, { type Table } from 'dexie';
import type { PosMutation } from '@ziro/shared-types';

export interface PosCatalogRow {
  sku: string;
  title: string;
  barcode?: string;
  price_minor: number;
  on_hand: number;
  version: number;
}

export interface PosCartRow {
  sku: string;
  title: string;
  qty: number;
  unit_price_minor: number;
}

export interface PosMutationQueueRow {
  client_mutation_id: string;
  mutation: PosMutation;
  queued_at: string;
}

export interface PosConflictRow {
  conflict_id: string;
  client_mutation_id: string;
  mutation: PosMutation;
  server_version: number;
  server_balance: number;
  message: string;
  detected_at: string;
}

export interface PosSyncMetaRow {
  key: string;
  value: string;
}

export class ZiroPosDb extends Dexie {
  catalog!: Table<PosCatalogRow, string>;
  cart!: Table<PosCartRow, string>;
  mutationQueue!: Table<PosMutationQueueRow, string>;
  conflicts!: Table<PosConflictRow, string>;
  syncMeta!: Table<PosSyncMetaRow, string>;

  constructor(name = 'ziro_pos_db') {
    super(name);
    this.version(1).stores({
      catalog: 'sku, barcode, version',
      cart: 'sku',
      mutationQueue: 'client_mutation_id, queued_at',
      conflicts: 'conflict_id, client_mutation_id, detected_at',
      syncMeta: 'key',
    });
  }
}

export interface PosStorageAdapter {
  getCatalogItem(sku: string): Promise<PosCatalogRow | undefined>;
  upsertCatalogItem(item: PosCatalogRow): Promise<void>;
  listCatalog(): Promise<PosCatalogRow[]>;
  enqueueMutation(mutation: PosMutation): Promise<void>;
  listPendingMutations(): Promise<PosMutation[]>;
  removeMutation(clientMutationId: string): Promise<void>;
  addConflict(conflict: PosConflictRow): Promise<void>;
  listConflicts(): Promise<PosConflictRow[]>;
  getConflict(conflictId: string): Promise<PosConflictRow | undefined>;
  removeConflict(conflictId: string): Promise<void>;
}

export class DexiePosStorage implements PosStorageAdapter {
  constructor(private db: ZiroPosDb = new ZiroPosDb()) {}

  async getCatalogItem(sku: string): Promise<PosCatalogRow | undefined> {
    return this.db.catalog.get(sku);
  }

  async upsertCatalogItem(item: PosCatalogRow): Promise<void> {
    await this.db.catalog.put(item);
  }

  async listCatalog(): Promise<PosCatalogRow[]> {
    return this.db.catalog.toArray();
  }

  async enqueueMutation(mutation: PosMutation): Promise<void> {
    await this.db.mutationQueue.put({
      client_mutation_id: mutation.client_mutation_id,
      mutation,
      queued_at: new Date().toISOString(),
    });
  }

  async listPendingMutations(): Promise<PosMutation[]> {
    const rows = await this.db.mutationQueue.orderBy('queued_at').toArray();
    return rows.map((r) => r.mutation);
  }

  async removeMutation(clientMutationId: string): Promise<void> {
    await this.db.mutationQueue.delete(clientMutationId);
  }

  async addConflict(conflict: PosConflictRow): Promise<void> {
    await this.db.conflicts.put(conflict);
  }

  async listConflicts(): Promise<PosConflictRow[]> {
    return this.db.conflicts.orderBy('detected_at').toArray();
  }

  async getConflict(conflictId: string): Promise<PosConflictRow | undefined> {
    return this.db.conflicts.get(conflictId);
  }

  async removeConflict(conflictId: string): Promise<void> {
    await this.db.conflicts.delete(conflictId);
  }
}
