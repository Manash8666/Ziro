import crypto from 'node:crypto';

function timingSafeHexEqual(aHex: string, bHex: string): boolean {
  const cleanA = aHex.trim().toLowerCase();
  const cleanB = bHex.trim().toLowerCase();
  if (cleanA.length === 0 || cleanA.length !== cleanB.length) {
    return false;
  }
  const bufA = Buffer.from(cleanA, 'utf8');
  const bufB = Buffer.from(cleanB, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Razorpay's `X-Razorpay-Signature` header:
 * `hex(HMAC_SHA256(RAZORPAY_WEBHOOK_SECRET, rawBody))`
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!params.signatureHeader || !params.secret.trim()) {
    return false;
  }

  const expectedHex = crypto
    .createHmac('sha256', params.secret.trim())
    .update(params.rawBody, 'utf8')
    .digest('hex');

  return timingSafeHexEqual(params.signatureHeader, expectedHex);
}

/**
 * Verifies Stripe's `Stripe-Signature` header (`t=<unix_sec>,v1=<hex_hmac>`),
 * enforcing a 300-second replay window and constant-time digest comparison.
 */
export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowUnixSeconds?: number;
}): boolean {
  if (!params.signatureHeader || !params.secret.trim()) {
    return false;
  }

  const tolerance = params.toleranceSeconds ?? 300;
  const nowSec = params.nowUnixSeconds ?? Math.floor(Date.now() / 1000);

  let timestampStr: string | null = null;
  const v1Signatures: string[] = [];

  for (const part of params.signatureHeader.split(',')) {
    const [rawKey, rawVal] = part.split('=');
    const key = rawKey?.trim();
    const val = rawVal?.trim();
    if (!key || !val) continue;

    if (key === 't') {
      timestampStr = val;
    } else if (key === 'v1') {
      v1Signatures.push(val);
    }
  }

  if (!timestampStr || v1Signatures.length === 0) {
    return false;
  }

  const parsedTs = Number.parseInt(timestampStr, 10);
  if (!Number.isFinite(parsedTs) || Math.abs(nowSec - parsedTs) > tolerance) {
    return false;
  }

  const signedPayload = `${timestampStr}.${params.rawBody}`;
  const expectedHex = crypto
    .createHmac('sha256', params.secret.trim())
    .update(signedPayload, 'utf8')
    .digest('hex');

  return v1Signatures.some((candidate) => timingSafeHexEqual(candidate, expectedHex));
}
