import { describe, expect, it, vi } from 'vitest';
import { InMemoryPosStorage, PosSyncEngine } from '../lib/sync-engine';

describe('PosSyncEngine', () => {
  it('queues offline sales while offline, flushes batch on reconnect, and updates local catalog version', async () => {
    const storage = new InMemoryPosStorage([
      {
        sku: 'BRK-001',
        title: 'Ceramic Brake Pad',
        barcode: '890123456001',
        price_minor: 150000,
        on_hand: 10,
        version: 1,
      },
    ]);

    let online = false;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        location_id: 'loc_1',
        results: [
          {
            client_mutation_id: (await storage.listPendingMutations())[0]?.client_mutation_id ?? '',
            status: 'APPLIED',
            reconciled_deltas: [
              { sku: 'BRK-001', delta: -2, balance_after: 8, version_after: 2 },
            ],
            server_version: 2,
            server_balance: 8,
          },
        ],
        current_inventory: [
          { sku: 'BRK-001', on_hand: 8, reserved: 0, version: 2 },
        ],
      }),
    }));

    const engine = new PosSyncEngine({
      storage,
      deviceId: 'pos-counter-1',
      locationId: 'loc_1',
      apiBaseUrl: 'http://localhost:9000',
      isOnline: () => online,
      fetchImpl: fetchMock as any,
    });

    const queued = await engine.queueSale({
      items: [{ sku: 'BRK-001', qty: 2, unit_price_minor: 150000 }],
      payment_method: 'UPI',
    });
    expect(queued.client_mutation_id).toBeTruthy();
    expect((await storage.listPendingMutations()).length).toBe(1);

    // Offline flush is a no-op
    const offlineFlush = await engine.flushPendingMutations();
    expect(offlineFlush.flushed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();

    // Come online -> flush batch
    online = true;
    const onlineFlush = await engine.flushPendingMutations();
    expect(onlineFlush.flushed).toBe(1);
    expect((await storage.listPendingMutations()).length).toBe(0);

    const updatedItem = await storage.getCatalogItem('BRK-001');
    expect(updatedItem?.version).toBe(2);
    expect(updatedItem?.on_hand).toBe(8);
  });

  it('moves CONFLICT mutations into conflict queue and resolves via accept_server, force_override, or void', async () => {
    const storage = new InMemoryPosStorage([
      {
        sku: 'OIL-002',
        title: 'Synthetic Engine Oil 5W30',
        barcode: '890123456002',
        price_minor: 95000,
        on_hand: 5,
        version: 1,
      },
    ]);

    const fetchMock = vi.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      const mutId = body.mutations[0].client_mutation_id;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          location_id: 'loc_1',
          results: [
            {
              client_mutation_id: mutId,
              status: 'CONFLICT',
              reconciled_deltas: [],
              server_version: 4,
              server_balance: 3,
              message: 'Version conflict',
            },
          ],
          current_inventory: [{ sku: 'OIL-002', on_hand: 3, reserved: 0, version: 4 }],
        }),
      };
    });

    const engine = new PosSyncEngine({
      storage,
      deviceId: 'pos-counter-2',
      locationId: 'loc_1',
      apiBaseUrl: 'http://localhost:9000',
      isOnline: () => true,
      fetchImpl: fetchMock as any,
    });

    const m = await engine.queueStockAudit({
      sku: 'OIL-002',
      counted_qty: 4,
      audit_mode: 'ABSOLUTE',
    });

    const res = await engine.flushPendingMutations();
    expect(res.conflicts).toBe(1);

    const conflicts = await storage.listConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].client_mutation_id).toBe(m.client_mutation_id);

    // Resolve with accept_server -> adopts server version & balance and removes conflict
    await engine.resolveConflict(conflicts[0].conflict_id, 'accept_server');
    expect((await storage.listConflicts()).length).toBe(0);
    const oil = await storage.getCatalogItem('OIL-002');
    expect(oil?.version).toBe(4);
    expect(oil?.on_hand).toBe(3);

    // Queue another conflict and resolve via force_override -> re-queues with server_version
    const m2 = await engine.queueSale({
      items: [{ sku: 'OIL-002', qty: 1, unit_price_minor: 95000 }],
      payment_method: 'CASH',
    });
    await engine.flushPendingMutations();
    const conflicts2 = await storage.listConflicts();
    expect(conflicts2.length).toBe(1);
    await engine.resolveConflict(conflicts2[0].conflict_id, 'force_override');
    const requeued = await storage.listPendingMutations();
    expect(requeued.length).toBe(1);
    expect(requeued[0].expected_version).toBe(4);
    expect(requeued[0].client_mutation_id).not.toBe(m2.client_mutation_id);

    // Void resolution removes conflict without re-queuing
    await engine.flushPendingMutations();
    const conflicts3 = await storage.listConflicts();
    await engine.resolveConflict(conflicts3[0].conflict_id, 'void');
    expect((await storage.listConflicts()).length).toBe(0);
    expect((await storage.listPendingMutations()).length).toBe(0);
  });
});
