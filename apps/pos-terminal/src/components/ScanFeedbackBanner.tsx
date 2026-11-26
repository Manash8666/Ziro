import React from 'react';

export interface ScanFeedbackBannerProps {
  lastBarcode: string;
  lastItemTitle: string;
  timestampMs?: number;
  className?: string;
}

export const ScanFeedbackBanner: React.FC<ScanFeedbackBannerProps> = ({
  lastBarcode,
  lastItemTitle,
  timestampMs,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-[#00E599] bg-[#00E599]/10 px-4 py-3 text-sm text-[#00E599] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#00E599] animate-ping" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider">
          BARCODE SCANNED
        </span>
        <span className="text-xs text-[#8B95A5] font-mono">[{lastBarcode}]</span>
        <span className="font-medium text-[#F4F6F9]">{lastItemTitle}</span>
      </div>

      {timestampMs && (
        <span className="text-[10px] font-mono text-[#8B95A5]">
          {new Date(timestampMs).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
