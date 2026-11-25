import { z } from 'zod';
import { MoneyMinorSchema } from '../schemas/commerce.js';

/**
 * Zero GMV platform fee invariant across all Ziro agentic and core commerce protocols.
 */
export const ZIRO_PLATFORM_FEE_BPS = 0 as const;

/**
 * UCP v1 discovery manifest served at `/.well-known/ucp`.
 */
export const UcpDiscoveryManifestSchema = z.object({
  ucp_version: z.string().min(1).default('1.0'),
  merchant_name: z.string().min(1),
  platform_fee_bps: z.literal(ZIRO_PLATFORM_FEE_BPS),
  capabilities: z.array(z.string().min(1)).min(1),
  kya_required: z.boolean().default(true),
  acp_base_url: z.url(),
  webmcp_manifest_url: z.url(),
});
export type UcpDiscoveryManifest = z.infer<typeof UcpDiscoveryManifestSchema>;

/**
 * Single WebMCP tool descriptor exposed to browser and AI shopping agents.
 */
export const WebMcpToolDescriptorSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  input_schema: z.record(z.string(), z.unknown()),
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
});
export type WebMcpToolDescriptor = z.infer<typeof WebMcpToolDescriptorSchema>;

/**
 * WebMCP manifest served at `/.well-known/webmcp.json`.
 */
export const WebMcpManifestSchema = z.object({
  schema_version: z.string().min(1).default('1.0'),
  tools: z.array(WebMcpToolDescriptorSchema).min(1),
});
export type WebMcpManifest = z.infer<typeof WebMcpManifestSchema>;

/**
 * Shipping destination address for ACP checkout tax, DDP duty, and fulfillment estimation.
 */
export const AcpShippingAddressSchema = z.object({
  country_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'country_code must be a 2-letter ISO code')
    .transform((code) => code.toUpperCase()),
  state_code: z.string().min(1).optional(),
  postal_code: z.string().min(1),
  city: z.string().min(1).optional(),
  line1: z.string().min(1).optional(),
});
export type AcpShippingAddress = z.infer<typeof AcpShippingAddressSchema>;

/**
 * Requested item line when creating an ACP checkout session.
 */
export const AcpLineItemInputSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  selected_optional_skus: z.array(z.string().min(1)).optional(),
  material_variant: z.string().min(1).optional(),
});
export type AcpLineItemInput = z.infer<typeof AcpLineItemInputSchema>;

/**
 * Request payload for `POST /api/agent/acp/v1/checkout-sessions`.
 */
export const AcpCheckoutCreateSchema = z.object({
  tenant_id: z.string().min(1),
  line_items: z.array(AcpLineItemInputSchema).min(1),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO code')
    .transform((code) => code.toUpperCase())
    .default('INR'),
  requested_discount_bps: z.number().int().min(0).max(10_000).default(0),
  shipping_address: AcpShippingAddressSchema,
});
export type AcpCheckoutCreate = z.infer<typeof AcpCheckoutCreateSchema>;

/**
 * Authoritatively priced item line stored on an ACP checkout session.
 */
export const AcpSessionLineItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  unit_price_minor: MoneyMinorSchema,
  line_total_minor: MoneyMinorSchema.optional(),
  title: z.string().min(1).optional(),
  hsn_code: z.string().min(2).optional(),
  gst_rate_bps: z.number().int().min(0).max(10_000).optional(),
  selected_optional_skus: z.array(z.string().min(1)).optional(),
  material_variant: z.string().min(1).optional(),
});
export type AcpSessionLineItem = z.infer<typeof AcpSessionLineItemSchema>;

/**
 * Lifecycle state of an ACP checkout session.
 */
export const AcpCheckoutStatusSchema = z.enum([
  'OPEN',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
]);
export type AcpCheckoutStatus = z.infer<typeof AcpCheckoutStatusSchema>;

/**
 * Persisted and returned ACP checkout session state using integer minor units.
 */
export const AcpCheckoutSessionSchema = z.object({
  session_id: z.uuid(),
  tenant_id: z.string().min(1),
  agent_id: z.string().min(1),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO code')
    .transform((code) => code.toUpperCase()),
  line_items: z.array(AcpSessionLineItemSchema).min(1),
  subtotal_minor: MoneyMinorSchema,
  discount_minor: MoneyMinorSchema,
  tax_minor: MoneyMinorSchema,
  total_minor: MoneyMinorSchema,
  status: AcpCheckoutStatusSchema,
  external_order_id: z.string().min(1).nullable().optional(),
  idempotency_key: z.string().min(1).nullable().optional(),
  created_at: z.iso.datetime({ offset: true }),
});
export type AcpCheckoutSession = z.infer<typeof AcpCheckoutSessionSchema>;

/**
 * Delegated payment token accepted during ACP checkout completion.
 */
export const AcpPaymentTokenSchema = z.object({
  provider: z.enum(['razorpay', 'stripe']),
  token: z.string().min(1),
  amount_minor: MoneyMinorSchema,
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter ISO code')
    .transform((code) => code.toUpperCase()),
});
export type AcpPaymentToken = z.infer<typeof AcpPaymentTokenSchema>;

/**
 * Request payload for `POST /api/agent/acp/v1/checkout-sessions/{id}/complete`.
 */
export const AcpCheckoutCompleteSchema = z.object({
  payment_token: AcpPaymentTokenSchema,
  idempotency_key: z.string().min(1),
});
export type AcpCheckoutComplete = z.infer<typeof AcpCheckoutCompleteSchema>;

/**
 * Know Your Agent (KYA) authentication headers: either HMAC-SHA256 triplet or Bearer JWT.
 */
export const KyaHeadersSchema = z
  .object({
    'x-ziro-agent-id': z.string().trim().min(1).optional(),
    'x-ziro-timestamp': z.string().trim().min(1).optional(),
    'x-ziro-agent-signature': z.string().trim().min(1).optional(),
    authorization: z
      .string()
      .trim()
      .regex(/^Bearer\s+\S+$/i, 'authorization header must use Bearer token format')
      .optional(),
  })
  .superRefine((headers, ctx) => {
    const hasBearer = Boolean(headers.authorization);
    const hasAllHmac = Boolean(
      headers['x-ziro-agent-id'] &&
        headers['x-ziro-timestamp'] &&
        headers['x-ziro-agent-signature'],
    );
    if (!hasBearer && !hasAllHmac) {
      ctx.addIssue({
        code: 'custom',
        message:
          'KYA authentication requires either HMAC headers (x-ziro-agent-id, x-ziro-timestamp, x-ziro-agent-signature) or Bearer authorization',
      });
    }
  });
export type KyaHeaders = z.infer<typeof KyaHeadersSchema>;

/**
 * Risk tier output for COD-RTO Shield assessments.
 */
export const RtoRiskTierSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RtoRiskTier = z.infer<typeof RtoRiskTierSchema>;

/**
 * Supported checkout payment mode recommendations returned by COD-RTO Shield.
 */
export const RtoPaymentModeSchema = z.enum(['UPI_INTENT', 'UPI', 'CARD', 'NETBANKING', 'COD']);
export type RtoPaymentMode = z.infer<typeof RtoPaymentModeSchema>;

/**
 * Request payload for `POST /v1/rto/score`.
 */
export const RtoScoreRequestSchema = z.object({
  tenant_id: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'pincode must be a 6-digit Indian postal code'),
  cart_value_inr: z.number().int().min(0),
  cod_orders_count: z.number().int().min(0).default(0),
  rto_history_count: z.number().int().min(0).default(0),
  address_score: z.number().min(0).max(1),
  velocity_1h: z.number().int().min(0).default(0),
});
export type RtoScoreRequest = z.infer<typeof RtoScoreRequestSchema>;

/**
 * Response payload from `POST /v1/rto/score` with risk tier and UPI conversion nudge.
 */
export const RtoScoreResponseSchema = z.object({
  risk_score: z.number().min(0).max(1),
  risk_tier: RtoRiskTierSchema,
  upi_nudge_discount_inr: z.number().int().min(0),
  recommended_payment_modes: z.array(RtoPaymentModeSchema).min(1),
  factors: z.array(z.string().min(1)),
});
export type RtoScoreResponse = z.infer<typeof RtoScoreResponseSchema>;

/**
 * Beckn / ONDC protocol actions supported by Ziro's seller-node endpoints and callbacks.
 */
export const OndcBecknActionSchema = z.enum([
  'search',
  'select',
  'init',
  'confirm',
  'status',
  'cancel',
  'update',
  'track',
  'support',
  'rating',
  'on_search',
  'on_select',
  'on_init',
  'on_confirm',
  'on_status',
  'on_cancel',
  'on_update',
  'on_track',
  'on_support',
  'on_rating',
]);
export type OndcBecknAction = z.infer<typeof OndcBecknActionSchema>;

/**
 * ONDC Beckn v1.2 context header envelope.
 */
export const OndcBecknContextSchema = z.object({
  domain: z.string().min(1),
  country: z.string().min(2).max(3).default('IND'),
  city: z.string().min(1),
  action: OndcBecknActionSchema,
  core_version: z.string().min(1).default('1.2.0'),
  bap_id: z.string().min(1),
  bap_uri: z.url(),
  bpp_id: z.string().min(1).optional(),
  bpp_uri: z.url().optional(),
  transaction_id: z.string().min(1),
  message_id: z.string().min(1),
  timestamp: z.iso.datetime({ offset: true }),
  ttl: z.string().min(1).optional(),
});
export type OndcBecknContext = z.infer<typeof OndcBecknContextSchema>;

/**
 * Complete ONDC Beckn request / callback envelope.
 */
export const OndcBecknRequestSchema = z.object({
  context: OndcBecknContextSchema,
  message: z.record(z.string(), z.unknown()),
});
export type OndcBecknRequest = z.infer<typeof OndcBecknRequestSchema>;
