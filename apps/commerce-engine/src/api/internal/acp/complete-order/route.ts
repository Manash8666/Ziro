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
  const reservationId = req.body?.reservation_id ?? '';
  const idempotencyKey = req.body?.idempotency_key ?? '';

  if (!container.acpReservations.has(reservationId)) {
    return res.status(404).json({ error: `Reservation '${reservationId}' not found` });
  }

  const cacheKey = `${tenantId}:${idempotencyKey}`;
  const existing = container.acpOrdersByIdempotency.get(cacheKey);
  if (existing) {
    return res.status(200).json(existing);
  }

  const orderResult = {
    external_order_id: `ord_acp_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    status: 'COMPLETED',
  };
  if (idempotencyKey) {
    container.acpOrdersByIdempotency.set(cacheKey, orderResult);
  }

  return res.status(200).json(orderResult);
}
