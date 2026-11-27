import React from 'react';
import Link from 'next/link';
import { ZiroButton } from '@ziro/ui-kit';

export interface ProductItem {
  handle: string;
  title: string;
  sku: string;
  priceMinor: number;
  currency: string;
  category: string;
  fitmentSummary: string;
  inStock?: boolean;
}

export interface ProductCardProps {
  product: ProductItem;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = '',
}) => {
  const priceFormatted = (product.priceMinor / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: product.currency ?? 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-5 hover:border-[var(--ziro-accent-brand,#7A243B)] transition-all shadow-sm ${className}`}
    >
      <div className="space-y-3">
        {/* Category & Status */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--ziro-text-secondary,#C9A3AC)]">{product.category}</span>
          <span className="text-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] border border-[var(--ziro-badge-border,#7A243B)] px-2 py-0.5 rounded font-bold">
            In Stock
          </span>
        </div>

        {/* Thumbnail Placeholder */}
        <div className="flex h-40 w-full items-center justify-center rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)]">
          <span className="font-mono text-xs text-[var(--ziro-text-secondary,#C9A3AC)]">{product.sku}</span>
        </div>

        {/* Title & SKU */}
        <div>
          <span className="text-[10px] font-mono text-[var(--ziro-text-secondary,#C9A3AC)]">SKU: {product.sku}</span>
          <h3 className="text-base font-semibold text-[var(--ziro-text-primary,#F6DCE2)] line-clamp-2">
            {product.title}
          </h3>
        </div>

        {/* Fitment Tag */}
        <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] bg-[var(--ziro-bg-canvas,#14090D)] p-2 rounded border border-[var(--ziro-border-hairline,#3D1C26)]/60">
          <span className="text-[var(--ziro-cta-bg,#E8A5B5)] font-mono font-bold">Fitment:</span> {product.fitmentSummary}
        </p>
      </div>

      {/* Price & Action */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--ziro-border-hairline,#3D1C26)] pt-4">
        <div>
          <span className="text-[10px] font-mono uppercase text-[var(--ziro-text-secondary,#C9A3AC)]">Price (Net 0% Tax)</span>
          <p className="text-lg font-bold font-mono text-[var(--ziro-text-primary,#F6DCE2)] ziro-tabular">
            {priceFormatted}
          </p>
        </div>

        <Link href={`/product/${product.handle}`}>
          <ZiroButton variant="primary" size="sm">
            View BOM ↗
          </ZiroButton>
        </Link>
      </div>
    </div>
  );
};
