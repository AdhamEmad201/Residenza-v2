'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicProperty } from '@/types/api';
import { BACKEND_URL } from '@/lib/api/client';
import { formatAreaSqm, formatPriceEgp } from '@/lib/utils/format';
import {
  ACCOUNT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  RENTAL_PERIOD_LABELS,
  TRANSACTION_LABELS,
} from '@/lib/api/public';

export interface PropertyCardProps {
  property: PublicProperty;
}

const CURATED_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
];

function resolveImageUrl(
  image?: { url?: string; file_path?: string } | null,
  propertyId = 1
): string {
  if (image?.url) {
    return image.url.startsWith('http')
      ? image.url
      : `${BACKEND_URL}${image.url.startsWith('/') ? image.url : `/${image.url}`}`;
  }
  if (image?.file_path) {
    return `${BACKEND_URL}/storage/${image.file_path.replace(/^\/+/, '')}`;
  }
  return CURATED_FALLBACK_IMAGES[Math.abs(propertyId) % CURATED_FALLBACK_IMAGES.length];
}

function resolveCompanyLogoUrl(company?: {
  logo_url?: string | null;
  logo_path?: string | null;
} | null): string | null {
  if (!company) return null;
  if (company.logo_url) {
    return company.logo_url.startsWith('http')
      ? company.logo_url
      : `${BACKEND_URL}${company.logo_url.startsWith('/') ? company.logo_url : `/${company.logo_url}`}`;
  }
  if (company.logo_path) {
    return `${BACKEND_URL}/storage/${company.logo_path.replace(/^\/+/, '')}`;
  }
  return null;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const primaryImage =
    property.images?.find((img) => img.is_primary) || property.images?.[0] || null;
  const coverUrl = resolveImageUrl(primaryImage, property.id);
  const companyLogoUrl = resolveCompanyLogoUrl(property.company);

  const isDualPrice =
    property.transaction_type === 'sale' &&
    property.payment_method === 'cash_or_installment' &&
    Boolean(property.installment_price_egp);

  const downPaymentNumber =
    property.down_payment_egp !== null && property.down_payment_egp !== undefined
      ? parseFloat(property.down_payment_egp)
      : null;

  return (
    <article
      ref={cardRef}
      className={`property-card group flex flex-col rounded-3xl border border-[#131E26]/5 bg-white p-3.5 shadow-ambient transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C59B4E]/35 ${
        isVisible ? 'reveal-visible' : 'reveal-up'
      }`}
    >
      {/* Borderless Rounded-2xl 4:3 Photo Frame with Smooth Zoom */}
      <Link
        href={`/properties/${property.slug}`}
        className="bg-nile-luxury relative block aspect-4/3 w-full overflow-hidden rounded-2xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={property.title_ar}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Warm Bottom Scrim for Contrast */}
        <div className="bg-card-scrim pointer-events-none absolute inset-0" />

        {/* Floating Badges */}
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#136F48] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
            معتمد للنشر
          </span>

          <span className="rounded-full bg-[#131E26]/88 px-3 py-1 text-[11px] font-bold text-white">
            {TRANSACTION_LABELS[property.transaction_type]}
            {property.payment_method
              ? ` · ${PAYMENT_METHOD_LABELS[property.payment_method]}`
              : ''}
          </span>
        </div>

        {/* Bottom Location & Reference Overlay Pill */}
        <div className="absolute inset-x-3.5 bottom-3 flex items-center justify-between gap-2 text-white">
          <span className="rounded-full bg-[#131E26]/75 px-3 py-1 text-[11px] font-semibold">
            {property.location?.name_ar || 'سوهاج'}
          </span>
          <span className="font-mono text-[11px] text-white/90 tabular-nums-west">
            {property.reference_code}
          </span>
        </div>
      </Link>

      {/* Tactile Content Hierarchy Below Photo */}
      <div className="flex flex-1 flex-col justify-between px-2 pt-4 pb-1.5">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#9F7753]">
              {property.category?.name_ar || 'وحدة عقارية فاخرة'}
            </span>
            {property.company ? (
              <Link
                href={`/companies/${property.company.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex max-w-[190px] items-center gap-1.5 rounded-full bg-[#F3EAD8] px-2.5 py-1 text-[11px] font-bold text-[#403E3D] transition hover:bg-[#9F7753] hover:text-white"
                title={`زيارة واجهة ${property.company.name}`}
              >
                {companyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companyLogoUrl}
                    alt={property.company.name}
                    loading="lazy"
                    decoding="async"
                    className="h-4 w-4 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#403E3D] text-[9px] font-extrabold text-[#CEB38F]">
                    {property.company.name.slice(0, 1)}
                  </span>
                )}
                <span className="truncate">{property.company.name}</span>
                {property.company.is_verified && (
                  <span
                    className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#136F48] text-[9px] text-white"
                    aria-label="شريك معتمد"
                  >
                    ✔
                  </span>
                )}
              </Link>
            ) : (
              property.owner_display && (
                <span className="text-[11px] text-[#7D7772]">
                  {ACCOUNT_TYPE_LABELS[property.owner_display.account_type]}
                </span>
              )
            )}
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-[#403E3D] transition-colors group-hover:text-[#9F7753]">
            <Link href={`/properties/${property.slug}`} className="focus:outline-none">
              {property.title_ar}
            </Link>
          </h3>

          <p className="mt-1 line-clamp-1 text-xs text-[#5C5855]">
            {property.address_details_ar}
          </p>
        </div>

        {/* Soft Ambient Pricing Capsule & Spec Pills */}
        <div className="mt-4 space-y-3">
          {isDualPrice && property.installment_price_egp ? (
            <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#FAF7F2] p-3 tabular-nums-west">
              <div>
                <span className="block text-[10px] font-bold text-[#78828A]">
                  سعر الكاش
                </span>
                <span className="mt-0.5 block text-sm font-extrabold text-[#131E26]">
                  {formatPriceEgp(property.price_egp)}
                </span>
              </div>
              <div className="rounded-xl bg-[#F7EFE0] px-2.5 py-1">
                <span className="block text-[10px] font-bold text-[#8E6722]">
                  سعر التقسيط
                </span>
                <span className="mt-0.5 block text-sm font-extrabold text-[#A67C33]">
                  {formatPriceEgp(property.installment_price_egp)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between rounded-2xl bg-[#FAF7F2] px-3.5 py-2.5 tabular-nums-west">
              <span className="text-[11px] font-bold text-[#78828A]">
                {property.transaction_type === 'rent'
                  ? 'القيمة الإيجارية'
                  : property.payment_method === 'installment'
                    ? 'إجمالي التقسيط'
                    : 'السعر المطلوب'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-[#131E26]">
                  {formatPriceEgp(property.price_egp)}
                </span>
                {property.transaction_type === 'rent' && property.rental_period && (
                  <span className="text-xs text-[#78828A]">
                    / {RENTAL_PERIOD_LABELS[property.rental_period]}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Installment Terms Pill Row (OD-05 = A) */}
          {property.transaction_type === 'sale' &&
            (property.payment_method === 'installment' ||
              property.payment_method === 'cash_or_installment') && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#4A555E] tabular-nums-west">
                <span>
                  المقدم:{' '}
                  <strong className="text-[#131E26]">
                    {downPaymentNumber === null
                      ? 'بالاتفاق'
                      : downPaymentNumber === 0
                        ? 'بدون مقدم (0 ج.م)'
                        : formatPriceEgp(downPaymentNumber)}
                  </strong>
                </span>
                {property.installment_period_months && (
                  <span className="rounded-full bg-[#F7EFE0] px-2.5 py-0.5 font-bold text-[#8E6722]">
                    تقسيط {property.installment_period_months} شهر
                  </span>
                )}
              </div>
            )}

          {/* Soft Pill Tags for Area, Bedrooms, Bathrooms */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs tabular-nums-west">
            <span className="rounded-full bg-[#F3EDE2] px-3 py-1 font-bold text-[#131E26]">
              {formatAreaSqm(property.area_sqm)}
            </span>

            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <span className="rounded-full bg-[#FAF7F2] px-3 py-1 font-semibold text-[#4A555E]">
                {property.bedrooms} غرف
              </span>
            )}

            {property.bathrooms !== null && property.bathrooms !== undefined && (
              <span className="rounded-full bg-[#FAF7F2] px-3 py-1 font-semibold text-[#4A555E]">
                {property.bathrooms} حمام
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
