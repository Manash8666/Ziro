import {
  B2bWholesaleService,
  FitmentBomService,
  InMemoryB2bStore,
  InMemoryFitmentBomStore,
  InMemoryNet30CreditStore,
  InMemoryWebhookEventStore,
  OndcSellerAdapter,
  TenantContextResolver,
  ZiroTaxProvider,
} from '@ziro/rails';
import { PosSyncService, type CatalogItemState } from './pos-sync.service.js';
import { CatalogIndexService, type MeilisearchIndexLike } from './catalog-index.service.js';

export interface EngineRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  body?: any;
  rawBody?: string | Buffer;
  scope?: {
    resolve<T = any>(key: string): T;
  };
}

export interface EngineResponse {
  status(code: number): EngineResponse;
  json(payload: unknown): EngineResponse;
}

export interface AcpReservationRecord {
  reservation_id: string;
  tenant_id: string;
  subtotal_minor: number;
  tax_minor: number;
  cogs_total_minor: number;
  min_margin_bps: number;
  items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    unit_price_minor: number;
    total_minor: number;
  }>;
}

export interface EngineContainer {
  tenantResolver: TenantContextResolver;
  bomStore: InMemoryFitmentBomStore;
  fitmentBomService: FitmentBomService;
  creditStore: InMemoryNet30CreditStore;
  b2bStore: InMemoryB2bStore;
  b2bService: B2bWholesaleService;
  taxProvider: ZiroTaxProvider;
  webhookEventStore: InMemoryWebhookEventStore;
  posSyncService: PosSyncService;
  catalogIndexService: CatalogIndexService;
  ondcAdapter?: OndcSellerAdapter;
  internalSecret: string;
  acpReservations: Map<string, AcpReservationRecord>;
  acpOrdersByIdempotency: Map<string, { external_order_id: string; status: string }>;
}

let defaultContainer: EngineContainer | null = null;

export function createEngineContainer(options?: {
  tenantResolver?: TenantContextResolver;
  bomStore?: InMemoryFitmentBomStore;
  creditStore?: InMemoryNet30CreditStore;
  b2bStore?: InMemoryB2bStore;
  ondcAdapter?: OndcSellerAdapter;
  meilisearchIndex?: MeilisearchIndexLike;
  fetchImpl?: typeof fetch;
  internalSecret?: string;
  initialCatalog?: CatalogItemState[];
}): EngineContainer {
  const tenantResolver = options?.tenantResolver ?? new TenantContextResolver({ defaultMode: 'single' });
  const bomStore = options?.bomStore ?? new InMemoryFitmentBomStore();
  const fitmentBomService = new FitmentBomService(bomStore);
  const creditStore = options?.creditStore ?? new InMemoryNet30CreditStore();
  const b2bStore = options?.b2bStore ?? new InMemoryB2bStore();
  const b2bService = new B2bWholesaleService({
    b2bStore,
    creditStore,
    fitmentBomService,
  });

  const container: EngineContainer = {
    tenantResolver,
    bomStore,
    fitmentBomService,
    creditStore,
    b2bStore,
    b2bService,
    taxProvider: new ZiroTaxProvider({ defaultOriginStateCode: '27' }),
    webhookEventStore: new InMemoryWebhookEventStore(),
    posSyncService: new PosSyncService({
      initialCatalog: options?.initialCatalog,
      bomStore,
      fitmentBomService,
    }),
    catalogIndexService: new CatalogIndexService({
      meilisearchIndex: options?.meilisearchIndex,
      fetchImpl: options?.fetchImpl,
    }),
    ondcAdapter: options?.ondcAdapter,
    internalSecret:
      options?.internalSecret ?? process.env.ZIRO_INTERNAL_SECRET ?? 'ziro-internal-dev-secret',
    acpReservations: new Map(),
    acpOrdersByIdempotency: new Map(),
  };

  return container;
}

export function resolveEngineContainer(req: EngineRequest): EngineContainer {
  if (req.scope) {
    try {
      const resolved = req.scope.resolve<EngineContainer>('ziroEngine');
      if (resolved && resolved.posSyncService) {
        return resolved;
      }
    } catch {
      // Fallback to singleton default container
    }
  }
  if (!defaultContainer) {
    defaultContainer = createEngineContainer();
  }
  return defaultContainer;
}

export function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return undefined;
}
