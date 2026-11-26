import crypto from 'node:crypto';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const secret = getHeader(req.headers, 'x-ziro-internal-secret');
  if (!secret || secret !== container.internalSecret) {
    return res.status(401).json({ error: 'Unauthorized internal request' });
  }

  const tenantId = req.body?.tenant_id ?? 'default';
  const lineItems: Array<{ product_id: string; quantity: number }> = req.body?.line_items ?? [];
  const requestedDiscountBps = Number(req.body?.requested_discount_bps ?? 0);
  const shippingAddress = req.body?.shipping_address;

  let subtotalMinor = 0;
  let cogsTotalMinor = 0;
  const itemsOut: Array<{
    product_id: string;
    title: string;
    quantity: number;
    unit_price_minor: number;
    total_minor: number;
  }> = [];

  for (const li of lineItems) {
    const product = container.posSyncService.findProductAcrossLocations(tenantId, li.product_id);
    const unitPrice = product?.price_minor ?? 100_000;
    const unitCogs = product?.cogs_minor ?? Math.floor(unitPrice * 0.7);
    const lineTotal = unitPrice * li.quantity;
    subtotalMinor += lineTotal;
    cogsTotalMinor += unitCogs * li.quantity;

    itemsOut.push({
      product_id: li.product_id,
      title: product?.title ?? `Item ${li.product_id}`,
      quantity: li.quantity,
      unit_price_minor: unitPrice,
      total_minor: lineTotal,
    });
  }

  const discountMinor = Math.floor((subtotalMinor * requestedDiscountBps) / 10_000);
  const netSubtotalMinor = Math.max(0, subtotalMinor - discountMinor);

  const taxLines = await container.taxProvider.getTaxLines(
    itemsOut.map((item) => ({
      id: item.product_id,
      product_id: item.product_id,
      unit_price_minor: Math.floor(
        (item.unit_price_minor * (10_000 - requestedDiscountBps)) / 10_000,
      ),
      quantity: item.quantity,
    })),
    [],
    {
      shipping_address: {
        country_code: shippingAddress?.country ?? 'IN',
        province_code: shippingAddress?.state_code ?? '27',
      },
    },
  );
  const taxMinor = taxLines.reduce((sum, l) => sum + l.amount_minor, 0);

  const reservationId = `res_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const record = {
    reservation_id: reservationId,
    tenant_id: tenantId,
    subtotal_minor: subtotalMinor,
    tax_minor: taxMinor,
    cogs_total_minor: cogsTotalMinor,
    min_margin_bps: 1500,
    items: itemsOut,
  };
  container.acpReservations.set(reservationId, record);

  return res.status(200).json({
    ...record,
    net_subtotal_minor: netSubtotalMinor,
  });
}
