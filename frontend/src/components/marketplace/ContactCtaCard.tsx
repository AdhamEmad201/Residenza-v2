'use client';

import React, { useState } from 'react';
import type { PublicProperty } from '@/types/api';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';

export interface ContactCtaCardProps {
  property: PublicProperty;
}

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

function normalizeWhatsappNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('20')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `2${digits}`;
  }
  return `20${digits}`;
}

export function ContactCtaCard({ property }: ContactCtaCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(property.reference_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const whatsappDigits = normalizeWhatsappNumber(
    property.contact_whatsapp || property.contact_phone
  );

  const pageUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `${APP_BASE_URL}/properties/${property.slug}`;

  const whatsappMessage = `مرحباً، أستفسر عن العقار المعروض على منصة ريزيدنزا سوهاج:\n• العنوان: ${property.title_ar}\n• كود المرجع: ${property.reference_code}\n• الرابط: ${pageUrl}`;
  const whatsappHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const ownerName = property.owner_display?.name || 'معلن معتمد لدى ريزيدنزا';
  const accountType = property.owner_display?.account_type || 'individual';
  const companyName = property.owner_display?.company_name;

  return (
    <aside
      aria-label="بطاقة التواصل مع المعلن"
      className="sticky top-28 rounded-3xl bg-white p-6 shadow-ambient-lg space-y-6"
    >
      {/* Honest Verification Pill (D-11) */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F6EF] px-4 py-1.5 text-xs font-bold text-[#136F48]">
          <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
          معتمد للنشر — تمت مراجعة البيانات
        </span>
      </div>

      {/* Publisher Identity */}
      <div className="rounded-2xl bg-[#FAF7F2] p-4">
        <span className="inline-block rounded-full bg-[#F7EFE0] px-3 py-0.5 text-[11px] font-bold text-[#8E6722]">
          {ACCOUNT_TYPE_LABELS[accountType]}
        </span>
        <p className="mt-2 text-lg font-bold text-[#131E26]">{ownerName}</p>
        {companyName && (
          <p className="mt-0.5 text-xs font-medium text-[#4A555E]">{companyName}</p>
        )}
      </div>

      {/* Reference Code Quick Copy Capsule */}
      <div className="flex items-center justify-between rounded-2xl bg-[#F3EDE2]/75 px-4 py-3">
        <div>
          <span className="block text-[10px] font-bold text-[#78828A]">
            كود الإعلان المرجعي
          </span>
          <span className="font-mono text-sm font-extrabold text-[#131E26] tabular-nums-west">
            {property.reference_code}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyRef}
          className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#131E26] shadow-2xs transition hover:bg-[#131E26] hover:text-white active:scale-95"
        >
          {copied ? 'تم النسخ ✓' : 'نسخ الكود'}
        </button>
      </div>

      {/* Direct Communication Pill CTAs */}
      <div className="space-y-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#136F48] px-6 py-4 text-xs font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#0E5637] hover:shadow-lg active:scale-[0.98]"
        >
          <span>تواصل عبر واتساب الآن</span>
        </a>

        <a
          href={`tel:${property.contact_phone}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#131E26] px-6 py-4 text-xs font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#1E2E3A] active:scale-[0.98] tabular-nums-west"
        >
          <span>اتصال هاتفي مباشر:</span>
          <span dir="ltr">{property.contact_phone}</span>
        </a>
      </div>

      {/* Safety & Honest Verification Guidelines */}
      <div className="rounded-2xl bg-[#FAF7F2] p-4 text-[11px] leading-relaxed text-[#4A555E]">
        <p className="font-bold text-[#131E26]">ضوابط التعامل الآمن في سوهاج:</p>
        <ul className="mt-1.5 list-disc space-y-1 ps-4">
          <li>اذكر الكود المرجعي ({property.reference_code}) عند الاستفسار.</li>
          <li>عاين العقار ميدانياً وتحقق من مستندات الملكية الأصلية قبل التعاقد.</li>
          <li>اعتماد النشر يعني مراجعة اكتمال بيانات الإعلان وليس توثيقاً قانونياً للملكية.</li>
        </ul>
      </div>
    </aside>
  );
}
