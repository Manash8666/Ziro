import type { EngineRequest, EngineResponse } from '../../../services/engine-container.js';

export async function PATCH(req: EngineRequest, res: EngineResponse): Promise<void> {
  const container = req.scope?.resolve('engineContainer');
  const accountId = req.params?.id;

  if (!accountId) {
    res.status(400).json({ error: 'Missing account id' });
    return;
  }

  const account = container.creditStore.getAccount(accountId);
  if (!account) {
    res.status(404).json({ error: `B2B account '${accountId}' not found` });
    return;
  }

  if (req.body.credit_limit_minor !== undefined) {
    account.credit_limit_minor = req.body.credit_limit_minor;
  }
  if (req.body.net_terms_days !== undefined) {
    account.net_terms_days = req.body.net_terms_days;
  }
  if (req.body.status !== undefined) {
    account.status = req.body.status;
  }

  container.creditStore.setAccount(account);
  res.status(200).json({ success: true, account });
}
