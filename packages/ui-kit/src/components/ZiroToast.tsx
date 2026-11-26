import React from 'react';

export interface ZiroToastProps {
  message: string;
  tone?: 'mint' | 'amber' | 'danger';
  onDismiss?: () => void;
  className?: string;
}

const TONE_STYLES = {
  mint: {
    border: 'border-[#00E599]',
    color: '#00E599',
    bg: 'bg-[#12161E]',
    dot: '#00E599',
  },
  amber: {
    border: 'border-[#F59E0B]',
    color: '#F59E0B',
    bg: 'bg-[#12161E]',
    dot: '#F59E0B',
  },
  danger: {
    border: 'border-[#EF4444]',
    color: '#EF4444',
    bg: 'bg-[#12161E]',
    dot: '#EF4444',
  },
};

export const ZiroToast: React.FC<ZiroToastProps> = ({
  message,
  tone = 'mint',
  onDismiss,
  className = '',
}) => {
  const currentTone = TONE_STYLES[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 rounded-lg border ${currentTone.border} ${currentTone.bg} px-4 py-3 shadow-lg ziro-glass-panel ${className}`}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: currentTone.dot }}
        />
        <p className="text-sm font-medium text-[#F4F6F9]">{message}</p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 text-xs font-mono text-[#8B95A5] hover:text-[#F4F6F9]"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};
