'use client';

import React, { useEffect } from 'react';

export interface ZiroModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ZiroModal: React.FC<ZiroModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Modal'}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative z-50 w-full max-w-lg rounded-xl border border-[#1F2633] bg-[#12161E] p-6 shadow-2xl ${className}`}
      >
        <div className="flex items-center justify-between border-b border-[#1F2633] pb-4 mb-4">
          {title && (
            <h3 className="text-base font-semibold text-[#F4F6F9] font-sans">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8B95A5] hover:text-[#F4F6F9] hover:bg-[#1F2633] focus:outline-none focus:ring-2 focus:ring-[#00E599]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
