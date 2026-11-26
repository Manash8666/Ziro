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
      className={`flex flex-col justify-between rounded-xl border border-[#1F2633] bg-[#12161E] p-5 hover:border-[#00E599]/50 transition-colors ${className}`}
    >
      <div className="space-y-3">
        {/* Category & Status */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#8B95A5]">{product.category}</span>
          <span className="text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded">
            In Stock
          </span>
        </div>

        {/* Thumbnail Placeholder */}
        <div className="flex h-40 w-full items-center justify-center rounded-lg border border-[#1F2633] bg-[#090B0E]">
          <span className="font-mono text-xs text-[#8B95A5]">{product.sku}</span>
        </div>

        {/* Title & SKU */}
        <div>
          <span className="text-[10px] font-mono text-[#8B95A5]">SKU: {product.sku}</span>
          <h3 className="text-base font-semibold text-[#F4F6F9] line-clamp-2">
            {product.title}
          </h3>
        </div>

        {/* Fitment Tag */}
        <p className="text-xs text-[#8B95A5] bg-[#090B0E] p-2 rounded border border-[#1F2633]/60">
          <span className="text-[#00E599] font-mono">Fitment:</span> {product.fitmentSummary}
        </p>
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1F2633] mt-4">
        <div>
          <span className="block text-[10px] font-mono text-[#8B95A5]">EXCL. GST</span>
          <span className="text-lg font-bold font-mono text-[#00E599] ziro-tabular">
            {priceFormatted}
          </span>
        </div>

        <Link href={`/products/${product.handle}`}>
          <ZiroButton variant="secondary" size="sm">
            View Assembly
          </ZiroButton>
        </Link>
      </div>
    </div>
  );
};
