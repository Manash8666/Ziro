import {
  StepResponse,
  WorkflowResponse,
  createStep,
  createWorkflow,
} from '@medusajs/framework/workflows-sdk';
import { B2bWholesaleService } from './b2b-wholesale.service.js';

export interface ApproveB2bQuoteInput {
  tenant_id: string;
  quote_id: string;
  b2bService: B2bWholesaleService;
  simulateOrderEmissionFailure?: boolean;
}

function resolveB2bService(
  serviceOrRef: B2bWholesaleService | { service_id?: string },
): B2bWholesaleService {
  if (typeof (serviceOrRef as B2bWholesaleService).reserveQuoteCredit === 'function') {
    return serviceOrRef as B2bWholesaleService;
  }
  const id = (serviceOrRef as { service_id?: string })?.service_id;
  const instance = id ? B2bWholesaleService.getInstance(id) : undefined;
  if (!instance) {
    throw new Error('B2bWholesaleService instance could not be resolved from workflow input');
  }
  return instance;
}

const reserveB2bCreditStep = createStep(
  'ziro-b2b-reserve-credit',
  async (input: ApproveB2bQuoteInput) => {
    const svc = resolveB2bService(input.b2bService);
    const reservation = await svc.reserveQuoteCredit(input.tenant_id, input.quote_id);
    return new StepResponse(reservation, {
      account_id: reservation.account_id,
      amount_minor: reservation.amount_minor,
      service_id: svc.service_id,
    });
  },
  async (comp) => {
    if (comp) {
      const svc = resolveB2bService({ service_id: comp.service_id });
      await svc.releaseQuoteCredit(comp.account_id, comp.amount_minor);
    }
  },
);

const allocateBomInventoryStep = createStep(
  'ziro-b2b-allocate-inventory',
  async (input: ApproveB2bQuoteInput) => {
    const svc = resolveB2bService(input.b2bService);
    const deductions = await svc.allocateQuoteInventory(input.tenant_id, input.quote_id);
    return new StepResponse(deductions, {
      tenant_id: input.tenant_id,
      deductions,
      service_id: svc.service_id,
    });
  },
  async (comp) => {
    if (comp) {
      const svc = resolveB2bService({ service_id: comp.service_id });
      await svc.restoreQuoteInventory(comp.tenant_id, comp.deductions);
    }
  },
);

const emitNet30OrderStep = createStep(
  'ziro-b2b-emit-net30-order',
  async (input: ApproveB2bQuoteInput) => {
    const svc = resolveB2bService(input.b2bService);
    const order = await svc.emitNet30Order(
      input.tenant_id,
      input.quote_id,
      input.simulateOrderEmissionFailure,
    );
    return new StepResponse(order);
  },
);

export const approveB2bQuoteWorkflow = createWorkflow(
  'ziro-approve-b2b-quote',
  (input: ApproveB2bQuoteInput) => {
    reserveB2bCreditStep(input);
    allocateBomInventoryStep(input);
    const result = emitNet30OrderStep(input);
    return new WorkflowResponse(result);
  },
);
