import type {
  ZiroCatalogSink,
  ZiroMigratedProduct,
  MigrationBatchReport,
} from '@ziro/migrator';

export class HttpZiroCatalogSink implements ZiroCatalogSink {
  readonly coreApiUrl: string;
  readonly internalToken: string;
  readonly fetchImpl: typeof fetch;

  constructor(options?: {
    coreApiUrl?: string;
    internalToken?: string;
    fetchImpl?: typeof fetch;
  }) {
    this.coreApiUrl = (
      options?.coreApiUrl ||
      process.env.ZIRO_CORE_API_URL ||
      'http://localhost:9000'
    ).replace(/\/$/, '');
    this.internalToken =
      options?.internalToken ||
      process.env.ZIRO_INTERNAL_SERVICE_TOKEN ||
      'ziro_internal_secret_token_123';
    this.fetchImpl = options?.fetchImpl || fetch;
  }

  async upsertProducts(tenantId: string, products: ZiroMigratedProduct[]): Promise<MigrationBatchReport> {
    const url = `${this.coreApiUrl}/admin/migrations/products`;

    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.internalToken}`,
        'X-Ziro-Tenant-Id': tenantId,
      },
      body: JSON.stringify({ products }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Commerce Engine Migration Error (${res.status}): ${errText}`);
    }

    return (await res.json()) as MigrationBatchReport;
  }
}
