'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface HidBurstSample {
  key: string;
  time: number;
}

export interface UseHidBarcodeScannerOptions {
  maxInterKeyMs?: number;
  minLength?: number;
  enabled?: boolean;
}

/**
 * Pure evaluation function for hardware barcode scanner bursts.
 * Hardware HID scanners transmit characters with inter-key latency strictly under 30ms,
 * terminating with an 'Enter' character.
 */
export function evaluateHidBurstSamples(
  samples: HidBurstSample[],
  maxInterKeyMs = 30,
  minLength = 3
): string | null {
  if (samples.length < minLength + 1) {
    return null;
  }

  const lastSample = samples[samples.length - 1];
  if (lastSample.key !== 'Enter') {
    return null;
  }

  const chars: string[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const current = samples[i];
    const next = samples[i + 1];

    if (current.key.length !== 1) {
      return null;
    }

    const delta = next.time - current.time;
    if (delta > maxInterKeyMs) {
      return null;
    }

    chars.push(current.key);
  }

  const barcode = chars.join('').trim();
  if (barcode.length < minLength) {
    return null;
  }

  return barcode;
}

/**
 * React hook capturing high-velocity hardware HID barcode scans.
 */
export function useHidBarcodeScanner(
  onScan: (barcode: string) => void,
  options: UseHidBarcodeScannerOptions = {}
) {
  const { maxInterKeyMs = 30, minLength = 3, enabled = true } = options;
  const samplesRef = useRef<HidBurstSample[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSamples = useCallback(() => {
    samplesRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore functional hotkeys
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const now = performance.now();

      // Clear previous burst timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If user types 'Enter', check if buffered samples constitute a valid HID burst
      if (event.key === 'Enter') {
        samplesRef.current.push({ key: 'Enter', time: now });
        const barcode = evaluateHidBurstSamples(
          samplesRef.current,
          maxInterKeyMs,
          minLength
        );

        if (barcode) {
          event.preventDefault();
          onScan(barcode);
        }

        clearSamples();
        return;
      }

      // Check if printable single character
      if (event.key.length === 1) {
        // If last sample was too long ago, start fresh burst
        const last = samplesRef.current[samplesRef.current.length - 1];
        if (last && now - last.time > maxInterKeyMs) {
          samplesRef.current = [];
        }

        samplesRef.current.push({ key: event.key, time: now });

        // Auto-reset buffer if no subsequent key within 100ms
        timeoutRef.current = setTimeout(() => {
          samplesRef.current = [];
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearSamples();
    };
  }, [enabled, maxInterKeyMs, minLength, onScan, clearSamples]);

  return { resetScanner: clearSamples };
}
