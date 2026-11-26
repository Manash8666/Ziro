'use client';

import React, { useEffect } from 'react';

export interface ZiroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
  className?: string;
}

export const ZiroDrawer: React.FC<ZiroDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Drawer'}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer surface */}
      <div
        className={`relative z-50 flex h-full w-full max-w-md flex-col border-[#1F2633] bg-[#090B0E] p-6 shadow-2xl transition-transform ${
          position === 'right'
            ? 'ml-auto border-l'
            : 'mr-auto border-r'
        } ${className}`}
      >
        <div className="flex items-center justify-between border-b border-[#1F2633] pb-4 mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-[#F4F6F9] font-sans">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8B95A5] hover:text-[#F4F6F9] hover:bg-[#12161E] focus:outline-none focus:ring-2 focus:ring-[#00E599]"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
