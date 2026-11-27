import type { EngineRequest } from '../services/engine-container.js';

export function authenticateInternalService(req: EngineRequest): { authorized: boolean; error?: string } {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const expectedToken = process.env.ZIRO_INTERNAL_SERVICE_TOKEN || 'ziro_internal_secret_token_123';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { authorized: false, error: 'Invalid Authorization format. Expected Bearer <token>' };
  }

  const token = parts[1];
  if (token !== expectedToken) {
    return { authorized: false, error: 'Unauthorized: invalid internal service token' };
  }

  return { authorized: true };
}
