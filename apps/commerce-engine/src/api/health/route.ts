import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';
import type { EngineRequest, EngineResponse } from '../../services/engine-container.js';

export async function GET(_req: EngineRequest, res: EngineResponse) {
  return res.status(200).json({
    status: 'ok',
    service: 'ziro-core',
    platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
  });
}
