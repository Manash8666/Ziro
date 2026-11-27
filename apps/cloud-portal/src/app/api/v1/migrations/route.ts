import { NextResponse } from 'next/server';
import {
  mapShopifyCsvToZiro,
  importShopifyCsvToCatalog,
  WooRestImporter,
  SSRFValidationError,
} from '@ziro/migrator';
import { HttpZiroCatalogSink } from '../../../../lib/ziro-core-sink';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const tenantId =
    url.searchParams.get('tenantId') ||
    request.headers.get('x-ziro-tenant-id') ||
    'default';
  const dryRun = url.searchParams.get('dryRun') === 'true';

  const contentType = request.headers.get('content-type') || '';

  // 1. Handle Multipart / Form-Data or Text CSV (Shopify)
  if (contentType.includes('multipart/form-data') || contentType.includes('text/csv')) {
    let csvContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (file && typeof file === 'object' && 'text' in file) {
        csvContent = await (file as Blob).text();
      } else {
        csvContent = (formData.get('csvText') as string) || '';
      }
    } else {
      csvContent = await request.text();
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
    }

    if (dryRun) {
      const mapped = mapShopifyCsvToZiro(tenantId, csvContent);
      return NextResponse.json({
        dryRun: true,
        source: 'shopify',
        totalProcessed: mapped.length,
        preview: mapped.slice(0, 10),
      });
    }

    const sink = new HttpZiroCatalogSink();
    try {
      const report = await importShopifyCsvToCatalog(tenantId, csvContent, sink);
      return NextResponse.json(report);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'Shopify migration failed' },
        { status: 502 }
      );
    }
  }

  // 2. Handle Application / JSON (WooCommerce or Direct Payload)
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const source = body.source || 'woocommerce';

    if (source === 'woocommerce') {
      const { storeUrl, consumerKey, consumerSecret } = body;
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return NextResponse.json(
          { error: 'Missing WooCommerce credentials: storeUrl, consumerKey, consumerSecret' },
          { status: 400 }
        );
      }

      const sink = new HttpZiroCatalogSink();
      try {
        const importer = new WooRestImporter({
          tenantId: body.tenantId || tenantId,
          storeUrl,
          consumerKey,
          consumerSecret,
          sink,
        });

        const report = await importer.syncCatalog({
          dryRun: body.dryRun ?? dryRun,
          maxPages: body.maxPages || 5,
        });

        return NextResponse.json(report);
      } catch (err: any) {
        if (err instanceof SSRFValidationError || err.name === 'SSRFValidationError') {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        return NextResponse.json(
          { error: err.message || 'WooCommerce sync failed' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: `Unsupported migration source: ${source}` },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Unsupported Content-Type. Expected multipart/form-data, text/csv, or application/json' },
    { status: 415 }
  );
}
