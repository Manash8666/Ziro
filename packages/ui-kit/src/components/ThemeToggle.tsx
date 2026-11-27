'use client';

import React, { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md';
}

export function ThemeToggle({
  className = '',
  showLabels = true,
  size = 'md',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const savedTheme = (localStorage.getItem('ziro-theme') as ThemeMode) ||
      (document.documentElement.getAttribute('data-theme') as ThemeMode) ||
      'dark';
    setTheme(savedTheme);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail && (customEvent.detail === 'dark' || customEvent.detail === 'light')) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener('ziro-theme-change', handleThemeChange);
    return () => window.removeEventListener('ziro-theme-change', handleThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem('ziro-theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
      } else {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
      }
      window.dispatchEvent(new CustomEvent('ziro-theme-change', { detail: nextTheme }));
    }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Day (Steamed Cream)' : 'Dark (Wine & Blush)'} mode`}
      title={`Switch to ${isDark ? 'Day (Steamed Cream & Warm Latte)' : 'Dark (Wine & Luminous Blush)'} mode`}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all duration-200 font-mono font-medium focus:outline-none focus:ring-2 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${
        isDark
          ? 'border-[#3D1C26] bg-[#221016] text-[#F6DCE2] hover:border-[#7A243B] hover:bg-[#2E121B] focus:ring-[#E8A5B5]'
          : 'border-[#DBC1AC] bg-[#FAF4EE] text-[#1E1A17] hover:border-[#7B5A44] hover:bg-[#F0E3D5] focus:ring-[#452F23]'
      } ${className}`}
    >
      <span className="flex items-center justify-center">
        {isDark ? '🍷' : '☕'}
      </span>
      {showLabels && (
        <span className="font-semibold tracking-wide">
          {isDark ? 'Wine & Blush' : 'Steamed Cream'}
        </span>
      )}
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          isDark ? 'bg-[#E8A5B5]' : 'bg-[#452F23]'
        }`}
      />
    </button>
  );
}
