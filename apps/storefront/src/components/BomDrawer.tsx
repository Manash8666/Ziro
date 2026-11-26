'use client';

import React from 'react';
import { ZiroDrawer, ZiroTable, type ColumnDef } from '@ziro/ui-kit';

export interface BomChildItem {
  sku: string;
  name: string;
  quantity: number;
  hsn: string;
}

export interface BomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assemblyTitle: string;
  assemblySku: string;
  childrenItems: BomChildItem[];
}

export const BomDrawer: React.FC<BomDrawerProps> = ({
  isOpen,
  onClose,
  assemblyTitle,
  assemblySku,
  childrenItems,
}) => {
  const columns: ColumnDef<BomChildItem>[] = [
    { key: 'sku', header: 'Component SKU', align: 'left' },
    { key: 'name', header: 'Description', align: 'left' },
    { key: 'quantity', header: 'Qty', align: 'center', isTabular: true },
    { key: 'hsn', header: 'HSN', align: 'right', isTabular: true },
  ];

  return (
    <ZiroDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Bill of Materials (BOM) Breakdown"
      position="right"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#1F2633] bg-[#12161E] p-4 space-y-1">
          <span className="text-xs font-mono text-[#8B95A5]">PARENT ASSEMBLY</span>
          <p className="text-sm font-semibold text-[#F4F6F9]">{assemblyTitle}</p>
          <span className="text-xs font-mono text-[#00E599]">{assemblySku}</span>
        </div>

        <p className="text-xs text-[#8B95A5]">
          All sub-components are guaranteed direct OEM-fit and tracked independently in the unified inventory ledger.
        </p>

        <ZiroTable
          columns={columns}
          data={childrenItems}
          keyField="sku"
          emptyMessage="No child components registered for this SKU."
        />
      </div>
    </ZiroDrawer>
  );
};
