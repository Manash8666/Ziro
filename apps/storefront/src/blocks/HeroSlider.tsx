'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ZiroButton, StatusBadge } from '@ziro/ui-kit';

export interface HeroSlide {
  id: string;
  tagline: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  badge?: string;
}

export interface HeroSliderProps {
  slides?: HeroSlide[];
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    tagline: 'Zero GMV Tax Commerce OS',
    title: 'Precision Retail for D2C & B2B Wholesale',
    description:
      'Eliminate 3% transaction taxes. Unified ledger for counter POS, online store, and autonomous AI shopping agents.',
    ctaText: 'Explore Catalog',
    ctaLink: '/configure',
    badge: '0% GMV Tax',
  },
  {
    id: 'slide-2',
    tagline: 'Local-First POS Hardware Acceleration',
    title: 'Zero Downtime Offline Billing & Scanners',
    description:
      'Continuous billing during internet drops. ESC/POS thermal printing and 30ms hardware barcode scanners built-in.',
    ctaText: 'Launch POS',
    ctaLink: '/checkout',
    badge: 'Zero Downtime',
  },
];

export function HeroSlider({ slides = DEFAULT_SLIDES }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeSlide = slides[currentIndex] ?? slides[0];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1F2633] bg-[#090B0E] p-8 md:p-12">
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#00E599]">
            {activeSlide.tagline}
          </span>
          {activeSlide.badge && (
            <StatusBadge variant="zero-fee" label={activeSlide.badge} />
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#F4F6F9] leading-tight">
          {activeSlide.title}
        </h1>

        <p className="text-sm md:text-base text-[#8B95A5] leading-relaxed">
          {activeSlide.description}
        </p>

        <div className="flex items-center gap-4 pt-2">
          <Link href={activeSlide.ctaLink}>
            <ZiroButton variant="primary">{activeSlide.ctaText}</ZiroButton>
          </Link>

          {slides.length > 1 && (
            <div className="flex items-center gap-2 ml-4">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-6 bg-[#00E599]'
                      : 'w-2 bg-[#1F2633] hover:bg-[#8B95A5]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
