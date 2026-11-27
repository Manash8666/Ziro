import { MerchantAdminShellClient } from './MerchantAdminShellClient';

export const metadata = {
  title: 'Merchant Admin Shell | Ziro Commerce OS',
  description: 'Shopify Polaris-inspired multi-vertical merchant administration, catalog management, and split-pane theme customizer.',
};

export default function AdminPage() {
  return <MerchantAdminShellClient />;
}
