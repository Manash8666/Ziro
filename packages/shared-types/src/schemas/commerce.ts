import { z } from 'zod';

/**
 * Non-negative integer currency amount in minor units (paise / cents).
 * Rejects floating-point fractions and negative values.
 */
export const MoneyMinorSchema = z
  .number()
  .int()
  .min(0)
  .refine(Number.isSafeInteger, {
    message: 'Money minor units must be a safe non-negative integer',
  });
export type MoneyMinor = z.infer<typeof MoneyMinorSchema>;

/**
 * Signed integer currency delta in minor units (paise / cents).
 */
export const SignedMoneyMinorSchema = z
  .number()
  .int()
  .refine(Number.isSafeInteger, {
    message: 'Signed money minor units must be a safe integer',
  });
export type SignedMoneyMinor = z.infer<typeof SignedMoneyMinorSchema>;

/**
 * Supported deployment tenancy modes.
 */
export const TenancyModeSchema = z.enum(['single', 'multi']);
export type TenancyMode = z.infer<typeof TenancyModeSchema>;

/**
 * Conflict resolution policy for offline POS delta synchronization.
 */
export const PosConflictPolicySchema = z.enum([
  'FORCE_SALE_WITH_ALERT',
  'STRICT_REJECT',
]);
export type PosConflictPolicy = z.infer<typeof PosConflictPolicySchema>;

/**
 * Resolved tenant runtime context across single-tenant and multi-tenant SaaS modes.
 */
export const TenantContextSchema = z.object({
  tenant_id: z.string().min(1),
  slug: z.string().min(1),
  primary_domain: z.string().min(1).nullable().optional(),
  mode: TenancyModeSchema.default('single'),
  medusa_store_id: z.string().min(1),
  medusa_sales_channel_id: z.string().min(1),
  pos_conflict_policy: PosConflictPolicySchema.default('FORCE_SALE_WITH_ALERT'),
  origin_state_code: z.string().regex(/^\d{2}$/).default('27'),
  min_margin_bps: z.number().int().min(0).max(10000).default(1500),
  currency_code: z.string().length(3).default('INR'),
});
export type TenantContext = z.infer<typeof TenantContextSchema>;

/**
 * Year/Make/Model vehicle definition for automotive & equipment fitment matrices.
 */
export const FitmentVehicleSchema = z
  .object({
    vehicle_id: z.number().int().positive().optional(),
    tenant_id: z.string().min(1),
    make: z.string().min(1),
    model: z.string().min(1),
    year_from: z.number().int().min(1950),
    year_to: z.number().int().min(1950),
    variant: z.string().default(''),
    fuel_type: z.string().default(''),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((vehicle) => vehicle.year_to >= vehicle.year_from, {
    message: 'year_to must be greater than or equal to year_from',
    path: ['year_to'],
  });
export type FitmentVehicle = z.infer<typeof FitmentVehicleSchema>;

/**
 * Mapping between a catalog SKU/product and a compatible vehicle.
 */
export const ProductFitmentSchema = z.object({
  fitment_id: z.number().int().positive().optional(),
  tenant_id: z.string().min(1),
  product_id: z.string().min(1),
  sku: z.string().min(1),
  vehicle_id: z.number().int().positive(),
  position: z.string().min(1).default('universal'),
  notes: z.string().default(''),
});
export type ProductFitment = z.infer<typeof ProductFitmentSchema>;

/**
 * Bill-of-Materials inventory calculation mode.
 */
export const BomStockModeSchema = z.enum(['VIRTUAL', 'HYBRID', 'PHYSICAL']);
export type BomStockMode = z.infer<typeof BomStockModeSchema>;

/**
 * Component line inside a Bill-of-Materials bundle recipe.
 */
export const BomComponentSchema = z.object({
  component_id: z.number().int().positive().optional(),
  bundle_id: z.number().int().positive().optional(),
  child_sku: z.string().min(1),
  qty_per_unit: z.number().int().positive(),
  is_optional: z.boolean().default(false),
  price_delta_minor: SignedMoneyMinorSchema.default(0),
  option_group: z.string().min(1).default('core'),
});
export type BomComponent = z.infer<typeof BomComponentSchema>;

/**
 * Single SKU item in a BOM resolution request, including optional 3D configurator selections.
 */
export const BomResolveItemInputSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  selected_optional_skus: z.array(z.string().min(1)).default([]),
  material_variant: z.string().min(1).optional(),
});
export type BomResolveItemInput = z.infer<typeof BomResolveItemInputSchema>;

/**
 * Request payload for resolving one or more BOM kits into child components.
 */
export const BomResolveRequestSchema = z.object({
  tenant_id: z.string().min(1).optional(),
  location_id: z.string().min(1).optional(),
  items: z.array(BomResolveItemInputSchema).min(1),
});
export type BomResolveRequest = z.infer<typeof BomResolveRequestSchema>;

/**
 * Resolved BOM item breakdown with availability and child SKU deductions.
 */
export const BomResolveItemOutputSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  stock_mode: BomStockModeSchema,
  available_units: z.number().int().min(0),
  unit_price_delta_minor: SignedMoneyMinorSchema.default(0),
  material_variant: z.string().min(1).optional(),
  components: z.array(
    z.object({
      child_sku: z.string().min(1),
      required_qty: z.number().int().positive(),
      price_delta_minor: SignedMoneyMinorSchema.default(0),
      is_optional: z.boolean().default(false),
      option_group: z.string().min(1).default('core'),
    }),
  ),
});
export type BomResolveItemOutput = z.infer<typeof BomResolveItemOutputSchema>;

/**
 * Response payload for BOM resolution.
 */
export const BomResolveResponseSchema = z.object({
  items: z.array(BomResolveItemOutputSchema),
});
export type BomResolveResponse = z.infer<typeof BomResolveResponseSchema>;

/**
 * B2B wholesale buyer account with Net-30 credit limit and tax identity.
 */
export const B2bAccountSchema = z.object({
  account_id: z.uuid(),
  tenant_id: z.string().min(1),
  company_name: z.string().min(1),
  tax_id: z.string().min(1),
  tax_id_type: z.enum(['GSTIN', 'EIN', 'VAT']),
  credit_limit_minor: MoneyMinorSchema,
  credit_used_minor: MoneyMinorSchema.default(0),
  net_terms_days: z.number().int().min(0).default(30),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'SUSPENDED']).default('ACTIVE'),
});
export type B2bAccount = z.infer<typeof B2bAccountSchema>;

/**
 * Payload to create a B2B wholesale quote.
 */
export const B2bQuoteCreateSchema = z.object({
  account_id: z.uuid(),
  currency_code: z.string().length(3).default('INR'),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
  notes: z.string().default(''),
});
export type B2bQuoteCreate = z.infer<typeof B2bQuoteCreateSchema>;

/**
 * Payload to approve a B2B wholesale quote and trigger Net-30 order emission.
 */
export const B2bQuoteApproveSchema = z.object({
  approver_id: z.string().min(1),
  approver_role: z.enum(['MERCHANT_ADMIN', 'B2B_COMPANY_APPROVER']),
  notes: z.string().optional(),
});
export type B2bQuoteApprove = z.infer<typeof B2bQuoteApproveSchema>;

/**
 * Offline POS mutation classification.
 */
export const PosMutationTypeSchema = z.enum([
  'POS_SALE',
  'STOCK_AUDIT',
  'RETURN',
]);
export type PosMutationType = z.infer<typeof PosMutationTypeSchema>;

/**
 * Stock audit counting mode (absolute shelf count vs signed relative delta).
 */
export const PosAuditModeSchema = z.enum(['ABSOLUTE', 'DELTA']);
export type PosAuditMode = z.infer<typeof PosAuditModeSchema>;

/**
 * Line item inside an offline POS mutation.
 */
export const PosLineItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().refine(Number.isSafeInteger, {
    message: 'POS line item qty must be a safe integer',
  }),
  unit_price_minor: MoneyMinorSchema,
  selected_optional_skus: z.array(z.string().min(1)).optional(),
});
export type PosLineItem = z.infer<typeof PosLineItemSchema>;

/**
 * Idempotent offline POS mutation queued locally and reconciled with @ziro/core.
 */
export const PosMutationSchema = z.object({
  client_mutation_id: z.uuid(),
  mutation_type: PosMutationTypeSchema,
  audit_mode: PosAuditModeSchema.optional(),
  timestamp: z.iso.datetime({ offset: true }),
  expected_version: z.number().int().min(0),
  line_items: z.array(PosLineItemSchema).min(1),
  payment_method: z
    .enum(['CASH', 'UPI', 'CARD', 'NET30', 'NONE'])
    .default('CASH'),
  customer_gstin: z.string().optional(),
});
export type PosMutation = z.infer<typeof PosMutationSchema>;

/**
 * Batch delta-sync request sent by an offline-capable POS terminal.
 */
export const PosSyncBatchRequestSchema = z.object({
  tenant_id: z.string().min(1).optional(),
  location_id: z.string().min(1),
  device_id: z.string().min(1),
  conflict_policy: PosConflictPolicySchema.optional(),
  mutations: z.array(PosMutationSchema).min(1),
});
export type PosSyncBatchRequest = z.infer<typeof PosSyncBatchRequestSchema>;

/**
 * Per-mutation reconciliation outcome returned by POS sync.
 */
export const PosSyncMutationResultSchema = z.object({
  client_mutation_id: z.uuid(),
  status: z.enum(['APPLIED', 'APPLIED_WITH_ALERT', 'DUPLICATE', 'CONFLICT']),
  reconciled_deltas: z
    .array(
      z.object({
        sku: z.string().min(1),
        delta: z.number().int(),
        balance_after: z.number().int(),
        version_after: z.number().int().min(1),
      }),
    )
    .default([]),
  server_version: z.number().int().min(1).optional(),
  server_balance: z.number().int().optional(),
  message: z.string().optional(),
});
export type PosSyncMutationResult = z.infer<typeof PosSyncMutationResultSchema>;

/**
 * Batch delta-sync response containing per-mutation statuses and latest inventory snapshot.
 */
export const PosSyncBatchResponseSchema = z.object({
  location_id: z.string().min(1),
  results: z.array(PosSyncMutationResultSchema),
  current_inventory: z
    .array(
      z.object({
        sku: z.string().min(1),
        on_hand: z.number().int(),
        reserved: z.number().int().min(0).default(0),
        version: z.number().int().min(1),
      }),
    )
    .default([]),
});
export type PosSyncBatchResponse = z.infer<typeof PosSyncBatchResponseSchema>;
