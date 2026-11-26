'use client';

import React from 'react';
import { ZiroButton } from '@ziro/ui-kit';

export interface QuickActionBarProps {
  onDrawerKick: () => void;
  onReprint: () => void;
  onSyncLedger: () => void;
  isSyncing?: boolean;
  pendingCount?: number;
  className?: string;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  onDrawerKick,
  onReprint,
  onSyncLedger,
  isSyncing = false,
  pendingCount = 0,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1F2633] bg-[#12161E] p-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#8B95A5] uppercase">
          HARDWARE CONTROLS:
        </span>
        <ZiroButton variant="secondary" size="sm" onClick={onDrawerKick}>
          Open Drawer
        </ZiroButton>
        <ZiroButton variant="secondary" size="sm" onClick={onReprint}>
          Print Receipt
        </ZiroButton>
      </div>

      <div className="flex items-center gap-2">
        <ZiroButton
          variant={pendingCount > 0 ? 'primary' : 'secondary'}
          size="sm"
          onClick={onSyncLedger}
          disabled={isSyncing}
        >
          {isSyncing
            ? 'Syncing Ledger...'
            : pendingCount > 0
            ? `Sync ${pendingCount} Offline Sales`
            : 'Ledger Synchronized'}
        </ZiroButton>
      </div>
    </div>
  );
};
