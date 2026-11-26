import { z } from 'zod';
import { MoneyMinorSchema } from './commerce.js';
import { ZIRO_PLATFORM_FEE_BPS } from '../agent/contracts.js';

export const SaaSPlanTierSchema = z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']);
export type SaaSPlanTier = z.infer<typeof SaaSPlanTierSchema>;

export const TenantProvisionRequestSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with optional single hyphens'),
  name: z.string().min(1).max(120),
  admin_email: z.string().email(),
  plan_tier: SaaSPlanTierSchema,
  origin_state_code: z.string().length(2).optional(),
  currency_code: z.string().min(3).max(3).default('INR'),
  custom_domain: z.string().min(3).max(253).optional(),
});
export type TenantProvisionRequest = z.infer<typeof TenantProvisionRequestSchema>;
export type TenantProvisionRequestInput = z.input<typeof TenantProvisionRequestSchema>;

export const TenantProvisionResponseSchema = z.object({
  tenant_id: z.string().min(1),
  slug: z.string().min(1),
  primary_domain: z.string().min(1),
  api_key: z.string().min(16),
  status: z.enum(['ACTIVE', 'PROVISIONING', 'SUSPENDED']),
  platform_fee_bps: z.literal(ZIRO_PLATFORM_FEE_BPS),
});
export type TenantProvisionResponse = z.infer<typeof TenantProvisionResponseSchema>;

export const CaddyDomainCheckResponseSchema = z.object({
  allowed: z.boolean(),
  domain: z.string(),
  tenant_id: z.string().optional(),
});
export type CaddyDomainCheckResponse = z.infer<typeof CaddyDomainCheckResponseSchema>;

export const EscPosPaperWidthSchema = z.union([z.literal(58), z.literal(80)]);
export type EscPosPaperWidth = z.infer<typeof EscPosPaperWidthSchema>;

export const EscPosReceiptItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().int().positive(),
  unit_price_minor: MoneyMinorSchema,
  total_minor: MoneyMinorSchema,
  hsn: z.string().optional(),
});
export type EscPosReceiptItem = z.infer<typeof EscPosReceiptItemSchema>;

export const EscPosTaxLineSchema = z.object({
  code: z.string().min(1),
  rate_pct: z.number().nonnegative(),
  amount_minor: MoneyMinorSchema,
});
export type EscPosTaxLine = z.infer<typeof EscPosTaxLineSchema>;

export const EscPosReceiptRequestSchema = z.object({
  paper_width: EscPosPaperWidthSchema.default(80),
  store_name: z.string().min(1),
  gstin: z.string().optional(),
  invoice_no: z.string().min(1),
  date: z.string().min(1),
  cashier_name: z.string().optional(),
  items: z.array(EscPosReceiptItemSchema).min(1),
  subtotal_minor: MoneyMinorSchema,
  tax_lines: z.array(EscPosTaxLineSchema),
  total_minor: MoneyMinorSchema,
  tender_type: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']),
  qr_payload: z.string().optional(),
  barcode_payload: z.string().optional(),
  cut_paper: z.boolean().default(true),
  open_cash_drawer: z.boolean().default(false),
});
export type EscPosReceiptRequest = z.infer<typeof EscPosReceiptRequestSchema>;

export const BarcodeScannerScanEventSchema = z.object({
  barcode: z.string().min(1),
  symbology: z.enum(['CODE128', 'EAN13', 'QR', 'UNKNOWN']).default('UNKNOWN'),
  duration_ms: z.number().nonnegative(),
  timestamp: z.number().int().positive(),
});
export type BarcodeScannerScanEvent = z.infer<typeof BarcodeScannerScanEventSchema>;

export const AgentTelemetryMetricSchema = z.object({
  agent_id: z.string().min(1),
  protocol: z.enum(['UCP', 'ACP', 'WEBMCP']),
  action: z.string().min(1),
  margin_protected: z.boolean(),
  discount_requested_bps: z.number().int().nonnegative(),
  discount_granted_bps: z.number().int().nonnegative(),
  cart_value_minor: MoneyMinorSchema,
  converted: z.boolean(),
});
export type AgentTelemetryMetric = z.infer<typeof AgentTelemetryMetricSchema>;
