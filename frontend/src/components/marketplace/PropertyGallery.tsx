'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { PropertyImage } from '@/types/api';
import { BACKEND_URL } from '@/lib/api/client';

export interface PropertyGalleryProps {
  images?: PropertyImage[];
  title: string;
  referenceCode: string;
}

const FALLBACK_GALLERY_URLS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
];

function resolveFullImageUrl(img: PropertyImage): string {
  if (img.url) {
    return img.url.startsWith('http')
      ? img.url
      : `${BACKEND_URL}${img.url.startsWith('/') ? img.url : `/${img.url}`}`;
  }
  return `${BACKEND_URL}/storage/${img.file_path.replace(/^\/+/, '')}`;
}

export function PropertyGallery({
  images = [],
  title,
  referenceCode,
}: PropertyGalleryProps) {
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const galleryUrls =
    sortedImages.length > 0
      ? sortedImages.map(resolveFullImageUrl)
      : FALLBACK_GALLERY_URLS;

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const total = galleryUrls.length;

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      } else if (event.key === 'ArrowLeft') {
        handleNext();
      } else if (event.key === 'ArrowRight') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, handleNext, handlePrev]);

  const currentUrl = galleryUrls[activeIndex] || galleryUrls[0];

  return (
    <div className="space-y-4">
      {/* Rounded-3xl Living Luxury Main Gallery Stage */}
      <div className="bg-nile-luxury relative overflow-hidden rounded-3xl shadow-ambient-lg">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="تكبير صورة العقار في وضع ملء الشاشة"
          className="group relative block aspect-16/9 w-full cursor-zoom-in overflow-hidden focus:outline-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentUrl}
            src={currentUrl}
            alt={`${title} - صورة ${activeIndex + 1}`}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          <div className="bg-card-scrim pointer-events-none absolute inset-0" />

          {/* Floating Counter & Expand Pills */}
          <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-[#131E26] shadow-sm tabular-nums-west">
              صورة {activeIndex + 1} من {total} · {referenceCode}
            </span>
            <span className="rounded-full bg-[#131E26]/88 px-4 py-1.5 text-xs font-bold text-[#E5C378]">
              تكبير العرض الفاخر
            </span>
          </div>
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="الصورة السابقة"
              className="absolute start-4 top-1/2 -translate-y-1/2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#131E26] shadow-md transition-colors hover:bg-[#131E26] hover:text-white active:scale-95"
            >
              &#8594;
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="الصورة التالية"
              className="absolute end-4 top-1/2 -translate-y-1/2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#131E26] shadow-md transition-colors hover:bg-[#131E26] hover:text-white active:scale-95"
            >
              &#8592;
            </button>
          </>
        )}
      </div>

      {/* Rounded-2xl Thumbnails Strip */}
      {total > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {galleryUrls.map((thumbUrl, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={`${thumbUrl}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`عرض الصورة رقم ${idx + 1}`}
                aria-current={isSelected ? 'true' : undefined}
                className={`relative h-20 w-32 shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-opacity duration-200 ${
                  isSelected
                    ? 'ring-2 ring-[#C59B4E] scale-[1.02] shadow-sm'
                    : 'opacity-65 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={`${title} مصغرة ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Accessible Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="عارض صور العقار"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#131E26]/95 p-4 backdrop-blur-md"
        >
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center">
            <div className="mb-4 flex w-full items-center justify-between text-white">
              <div className="text-xs font-bold tabular-nums-west">
                <span>{title}</span>
                <span className="mx-2 text-[#C59B4E]">•</span>
                <span>
                  {activeIndex + 1} / {total}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="cursor-pointer rounded-full bg-white/15 px-5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
              >
                إغلاق (Esc)
              </button>
            </div>

            <div className="relative flex max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-3xl bg-black/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={`${title} - عرض كامل ${activeIndex + 1}`}
                decoding="async"
                className="max-h-[78vh] w-auto rounded-2xl object-contain"
              />
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="السابق"
                    className="absolute start-4 top-1/2 -translate-y-1/2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#131E26] shadow-lg transition hover:bg-[#C59B4E] hover:text-white"
                  >
                    &#8594;
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="التالي"
                    className="absolute end-4 top-1/2 -translate-y-1/2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#131E26] shadow-lg transition hover:bg-[#C59B4E] hover:text-white"
                  >
                    &#8592;
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
