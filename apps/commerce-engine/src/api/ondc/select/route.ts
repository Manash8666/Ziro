import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const authHeader = getHeader(req.headers, 'authorization') ?? '';

  if (container.ondcAdapter && !container.ondcAdapter.verifyRequest(rawBody, authHeader)) {
    return res.status(401).json({ error: 'Invalid ONDC Beckn signature' });
  }

  return res.status(200).json({
    context: { ...(req.body?.context ?? {}), action: 'on_select' },
    message: { ack: { status: 'ACK' } },
  });
}
