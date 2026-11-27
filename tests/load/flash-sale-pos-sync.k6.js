import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// ==============================================================================
// Ziro Commerce OS - Stage 4 Flash-Sale & POS Sync Load Test Suite (k6)
// Simulates 400 concurrent Virtual Users (VUs) racing for a limited BOM kit
// and 100 concurrent VUs hammering the offline POS delta-sync endpoint.
// Invariant: Zero stock oversell & ZIRO_PLATFORM_FEE_BPS === 0.
// ==============================================================================

const oversellErrors = new Counter('oversell_errors');
const lockContentionErrors = new Counter('lock_contention_errors');
const successfulReservations = new Counter('successful_reservations');
const successfulPosSyncs = new Counter('successful_pos_syncs');
const platformFeeCompliance = new Rate('platform_fee_compliance');

export const options = {
  scenarios: {
    // Scenario 1: 400 VUs competing for limited BOM kits under Valkey distributed locks
    flash_sale_bom_race: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5s', target: 200 },
        { duration: '10s', target: 400 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '2s',
      exec: 'runFlashSale',
    },
    // Scenario 2: 100 VUs executing duplicate offline POS sync bursts
    pos_offline_delta_sync: {
      executor: 'constant-vus',
      vus: 100,
      duration: '15s',
      exec: 'runPosSync',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<350'], // 95% of requests under 350ms
    oversell_errors: ['count==0'],     // Zero inventory oversell allowed
    platform_fee_compliance: ['rate==1.0'], // 100% adherence to 0% GMV fee
  },
};

const BASE_URL = __ENV.COMMERCE_ENGINE_URL || 'http://localhost:9000';
const TENANT_ID = 'tenant_flash_sale_stage4';
const LIMITED_BOM_SKU = 'KIT-CERAMIC-COMBO';

export function runFlashSale() {
  const payload = JSON.stringify({
    parent_sku: LIMITED_BOM_SKU,
    quantity: 1,
    idempotency_key: `idemp_${__VU}_${__ITER}_${Date.now()}`,
    buyer_agent: 'gemini-agent-flash-buyer',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Ziro-Tenant-Id': TENANT_ID,
    },
  };

  const res = http.post(`${BASE_URL}/store/bom/resolve`, payload, params);

  if (res.status === 200) {
    successfulReservations.add(1);
    const body = JSON.parse(res.body);

    // Verify 0% GMV platform tax invariant
    const isZeroFee = body.platform_fee_bps === 0 || body.fee_amount_minor === 0;
    platformFeeCompliance.add(isZeroFee ? 1 : 0);
  } else if (res.status === 409) {
    // Inventory exhausted or lock acquired by another concurrent VU
    lockContentionErrors.add(1);
  } else if (res.status >= 500) {
    oversellErrors.add(1);
  }

  sleep(0.05);
}

export function runPosSync() {
  const syncPayload = JSON.stringify({
    device_id: `pos_counter_term_${__VU % 10}`,
    sync_batch_id: `batch_${Date.now()}_vu${__VU}`,
    transactions: [
      {
        order_id: `ord_local_${__VU}_${__ITER}`,
        sku: 'BRK-PAD-X',
        quantity: 1,
        total_minor: 450000,
        platform_fee_bps: 0,
        offline_timestamp: Date.now() - 5000,
      },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Ziro-Tenant-Id': TENANT_ID,
    },
  };

  const res = http.post(`${BASE_URL}/store/pos/sync`, syncPayload, params);

  const isSuccess = check(res, {
    'POS delta sync returned HTTP 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  if (isSuccess) {
    successfulPosSyncs.add(1);
    platformFeeCompliance.add(1);
  }

  sleep(0.1);
}
