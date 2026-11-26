import type { ProductMutationPayload } from '../services/catalog-index.service.js';
import type { EngineContainer } from '../services/engine-container.js';

export async function productMutatedSubscriber({
  event,
  container,
}: {
  event: { data: ProductMutationPayload };
  container: { resolve<T = EngineContainer>(key: string): T };
}): Promise<void> {
  const engine = container.resolve<EngineContainer>('ziroEngine');
  await engine.catalogIndexService.syncProductMutation(event.data);
}

export const config = {
  event: ['product.created', 'product.updated'],
};
