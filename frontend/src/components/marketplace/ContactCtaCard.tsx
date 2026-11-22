'use client';

import React, { useEffect, useState } from 'react';
import type { PublicProperty } from '@/types/api';
import {
  ACCOUNT_TYPE_LABELS,
  submitPropertyReport,
  trackPublicClick,
} from '@/lib/api/public';
import { ApiError } from '@/lib/api/client';

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('السعر أو البيانات غير دقيقة');
  const [reportPhone, setReportPhone] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    trackPublicClick({
      type: 'view',
      target_type: 'property',
      id: property.id,
    });
  }, [property.id]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    setReportError(null);
    try {
      const res = await submitPropertyReport(property.id, {
        reason: reportReason,
        reporter_phone: reportPhone.trim() || undefined,
        notes: reportNotes.trim() || undefined,
      });
      setReportSuccess(res.message || 'تم إرسال البلاغ بنجاح.');
      setReportNotes('');
    } catch (err) {
      setReportError(
        err instanceof ApiError ? err.message : 'تعذر إرسال البلاغ حالياً.'
      );
    } finally {
      setReportSubmitting(false);
    }
  };

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
          onClick={() =>
            trackPublicClick({
              type: 'whatsapp',
              target_type: 'property',
              id: property.id,
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#136F48] px-6 py-4 text-xs font-bold tracking-wide text-white shadow-md transition-all hover:bg-[#0E5637] hover:shadow-lg active:scale-[0.98]"
        >
          <span>تواصل عبر واتساب الآن</span>
        </a>

        <a
          href={`tel:${property.contact_phone}`}
          onClick={() =>
            trackPublicClick({
              type: 'phone',
              target_type: 'property',
              id: property.id,
            })
          }
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

      {/* Subtle Report Listing Trigger */}
      <div className="border-t border-[#403E3D]/10 pt-3 text-center">
        <button
          type="button"
          onClick={() => {
            setReportSuccess(null);
            setReportError(null);
            setReportOpen(true);
          }}
          className="cursor-pointer text-xs font-bold text-[#7D7772] transition hover:text-red-700"
        >
          🚩 إبلاغ عن مشكلة في هذا الإعلان
        </button>
      </div>

      {reportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="إبلاغ عن مشكلة في الإعلان"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-ambient-lg">
            <div className="flex items-center justify-between border-b border-[#403E3D]/10 pb-3">
              <h3 className="text-base font-extrabold text-[#403E3D]">
                إبلاغ عن مشكلة ({property.reference_code})
              </h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="cursor-pointer rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#403E3D]"
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm font-bold text-[#136F48]">{reportSuccess}</p>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="cursor-pointer rounded-full bg-[#403E3D] px-6 py-2 text-xs font-bold text-white"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-3.5">
                {reportError && (
                  <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700">
                    {reportError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#403E3D]">سبب البلاغ *</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-bold text-[#403E3D] focus:outline-none"
                  >
                    <option value="السعر أو البيانات غير دقيقة">السعر أو البيانات غير دقيقة</option>
                    <option value="العقار تم بيعه أو لم يعد متاحاً">العقار تم بيعه أو لم يعد متاحاً</option>
                    <option value="إعلان مكرر أو صور غير حقيقية">إعلان مكرر أو صور غير حقيقية</option>
                    <option value="رقم التواصل لا يعمل">رقم التواصل لا يعمل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#403E3D]">
                    رقم هاتفك (اختياري للمتابعة)
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2 text-xs font-bold text-[#403E3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#403E3D]">ملاحظات إضافية</label>
                  <textarea
                    rows={3}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="وضّح المشكلة باختصار..."
                    className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2 text-xs font-medium text-[#403E3D] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#403E3D]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="cursor-pointer rounded-full bg-[#9F7753] px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {reportSubmitting ? 'جارٍ الإرسال...' : 'إرسال البلاغ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
