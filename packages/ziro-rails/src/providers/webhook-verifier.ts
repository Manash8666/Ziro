import crypto from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyRazorpayWebhook(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeCompare(expected, signature);
  } catch {
    return false;
  }
}

export function verifyStripeWebhook(
  rawBody: string | Buffer,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300,
  currentTimestampSec?: number,
): boolean {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }
  try {
    const parts = signatureHeader.split(',');
    let timestampStr: string | undefined;
    const v1Signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestampStr = value;
      } else if (key === 'v1') {
        v1Signatures.push(value);
      }
    }

    if (!timestampStr || v1Signatures.length === 0) {
      return false;
    }

    const timestamp = Number(timestampStr);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    const now = currentTimestampSec ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSec) {
      return false;
    }

    const payload = Buffer.concat([
      Buffer.from(`${timestamp}.`, 'utf8'),
      Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8'),
    ]);

    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    for (const sig of v1Signatures) {
      if (safeCompare(expected, sig)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export interface WebhookEventRecord {
  tenant_id: string;
  provider: string;
  external_event_id: string;
  payload_hash: string;
  processed_at: string;
}

export class InMemoryWebhookEventStore {
  private events = new Map<string, WebhookEventRecord>();

  private makeKey(tenantId: string, provider: string, eventId: string): string {
    return `${tenantId}:${provider}:${eventId}`;
  }

  async hasEvent(tenantId: string, provider: string, eventId: string): Promise<boolean> {
    return this.events.has(this.makeKey(tenantId, provider, eventId));
  }

  async recordEvent(record: WebhookEventRecord): Promise<void> {
    this.events.set(
      this.makeKey(record.tenant_id, record.provider, record.external_event_id),
      record,
    );
  }

  async processIdempotently<T>(
    tenantId: string,
    provider: string,
    eventId: string,
    payloadHash: string,
    handler: () => Promise<T>,
  ): Promise<{ duplicate: boolean; result?: T }> {
    if (await this.hasEvent(tenantId, provider, eventId)) {
      return { duplicate: true };
    }
    const result = await handler();
    await this.recordEvent({
      tenant_id: tenantId,
      provider,
      external_event_id: eventId,
      payload_hash: payloadHash,
      processed_at: new Date().toISOString(),
    });
    return { duplicate: false, result };
  }
}

export class WebhookEventDeduplicator {
  constructor(private store: InMemoryWebhookEventStore) {}

  async processIdempotently<T>(
    tenantId: string,
    provider: string,
    eventId: string,
    payloadHash: string,
    handler: () => Promise<T>,
  ): Promise<{ duplicate: boolean; result?: T }> {
    return this.store.processIdempotently(tenantId, provider, eventId, payloadHash, handler);
  }
}
