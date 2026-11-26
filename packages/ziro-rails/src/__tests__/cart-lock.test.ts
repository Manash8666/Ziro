import { describe, expect, it } from 'vitest';
import { InMemoryCartLockStore, ValkeyCartLockManager } from '../index.js';

describe('ValkeyCartLockManager & InMemoryCartLockStore', () => {
  it('acquires cart locks atomically, prevents concurrent lock takeovers, and releases cleanly', async () => {
    const store = new InMemoryCartLockStore();
    const manager = new ValkeyCartLockManager({ store, defaultTtlMs: 5000 });

    const tenantId = 'tenant_spares_01';
    const cartId = 'cart_checkout_991';

    // Owner 1 acquires lock
    const lock1 = await manager.acquireCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'worker_agent_01',
      ttlMs: 3000,
    });
    expect(lock1.acquired).toBe(true);
    expect(lock1.lockKey).toBe(`lock:${tenantId}:cart:${cartId}`);
    expect(lock1.expiresAt).toBeGreaterThan(Date.now());

    // Owner 2 attempts to acquire same cart -> must be rejected
    const lock2 = await manager.acquireCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'pos_counter_02',
      ttlMs: 3000,
    });
    expect(lock2.acquired).toBe(false);

    // Extending lock by owner 1 succeeds
    const extended = await manager.extendCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'worker_agent_01',
      ttlMs: 6000,
    });
    expect(extended).toBe(true);

    // Extending lock by unauthorized owner fails
    const badExtend = await manager.extendCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'imposter',
      ttlMs: 6000,
    });
    expect(badExtend).toBe(false);

    // Release by imposter fails
    const badRelease = await manager.releaseCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'imposter',
    });
    expect(badRelease).toBe(false);

    // Release by owner 1 succeeds
    const released = await manager.releaseCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'worker_agent_01',
    });
    expect(released).toBe(true);

    // Now owner 2 can acquire lock
    const lock3 = await manager.acquireCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'pos_counter_02',
      ttlMs: 3000,
    });
    expect(lock3.acquired).toBe(true);
  });

  it('automatically expires expired locks according to TTL', async () => {
    const store = new InMemoryCartLockStore();
    const manager = new ValkeyCartLockManager({ store, defaultTtlMs: 50 });

    const tenantId = 't_test';
    const cartId = 'cart_quick_expire';

    await manager.acquireCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'owner_temp',
      ttlMs: 40,
    });

    // Wait 55ms for TTL expiration
    await new Promise((r) => setTimeout(r, 55));

    // Another owner can now acquire because previous lock expired
    const newAcquisition = await manager.acquireCartLock({
      tenantId,
      cartId,
      lockOwnerId: 'owner_next',
      ttlMs: 2000,
    });
    expect(newAcquisition.acquired).toBe(true);
  });
});
