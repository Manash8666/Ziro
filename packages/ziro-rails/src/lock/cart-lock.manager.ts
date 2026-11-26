export interface CartLockStore {
  setIfNotExists(key: string, ownerId: string, ttlMs: number): Promise<boolean>;
  extend(key: string, ownerId: string, ttlMs: number): Promise<boolean>;
  release(key: string, ownerId: string): Promise<boolean>;
}

export class InMemoryCartLockStore implements CartLockStore {
  private locks = new Map<string, { ownerId: string; expiresAt: number }>();

  async setIfNotExists(key: string, ownerId: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      return false;
    }

    this.locks.set(key, {
      ownerId,
      expiresAt: now + ttlMs,
    });
    return true;
  }

  async extend(key: string, ownerId: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (!existing || existing.expiresAt <= now || existing.ownerId !== ownerId) {
      return false;
    }

    existing.expiresAt = now + ttlMs;
    return true;
  }

  async release(key: string, ownerId: string): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (!existing || existing.expiresAt <= now || existing.ownerId !== ownerId) {
      return false;
    }

    this.locks.delete(key);
    return true;
  }
}

export interface AcquireCartLockInput {
  tenantId: string;
  cartId: string;
  lockOwnerId: string;
  ttlMs?: number;
}

export interface AcquireCartLockResult {
  acquired: boolean;
  lockKey: string;
  expiresAt: number;
}

export interface CartLockManagerOptions {
  store?: CartLockStore;
  defaultTtlMs?: number;
}

export class ValkeyCartLockManager {
  private store: CartLockStore;
  private defaultTtlMs: number;

  constructor(options?: CartLockManagerOptions) {
    this.store = options?.store ?? new InMemoryCartLockStore();
    this.defaultTtlMs = options?.defaultTtlMs ?? 15_000;
  }

  private buildKey(tenantId: string, cartId: string): string {
    return `lock:${tenantId}:cart:${cartId}`;
  }

  async acquireCartLock(input: AcquireCartLockInput): Promise<AcquireCartLockResult> {
    const ttlMs = input.ttlMs ?? this.defaultTtlMs;
    const lockKey = this.buildKey(input.tenantId, input.cartId);
    const acquired = await this.store.setIfNotExists(lockKey, input.lockOwnerId, ttlMs);
    const expiresAt = Date.now() + ttlMs;

    return {
      acquired,
      lockKey,
      expiresAt: acquired ? expiresAt : 0,
    };
  }

  async extendCartLock(input: {
    tenantId: string;
    cartId: string;
    lockOwnerId: string;
    ttlMs?: number;
  }): Promise<boolean> {
    const ttlMs = input.ttlMs ?? this.defaultTtlMs;
    const lockKey = this.buildKey(input.tenantId, input.cartId);
    return this.store.extend(lockKey, input.lockOwnerId, ttlMs);
  }

  async releaseCartLock(input: {
    tenantId: string;
    cartId: string;
    lockOwnerId: string;
  }): Promise<boolean> {
    const lockKey = this.buildKey(input.tenantId, input.cartId);
    return this.store.release(lockKey, input.lockOwnerId);
  }
}
