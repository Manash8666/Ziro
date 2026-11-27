import { MigrationStudio } from '../../components/MigrationStudio';

export const metadata = {
  title: '1-Click Migration Studio | Ziro Cloud',
  description: 'Import catalogs from Shopify CSV or sync WooCommerce stores with automated HSN/GST classification and 0% GMV fee.',
};

export default function MigratePage() {
  return (
    <main className="min-h-screen bg-[#090B0E] py-12 px-4 sm:px-6 lg:px-8">
      <MigrationStudio />
    </main>
  );
}
