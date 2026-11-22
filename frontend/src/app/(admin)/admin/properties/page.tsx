'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminProperty } from '@/types/api';
import {
  getAdminExportCsvUrl,
  getAdminProperties,
  moderateAdminProperty,
} from '@/lib/api/admin';
import {
  AvailabilityStatusBadge,
  ModerationStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { TRANSACTION_LABELS } from '@/lib/api/public';
import { formatAreaSqm, formatPriceEgp } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'stale' | '';

const QUEUE_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'stale', label: 'عقارات قديمة (+45 يوم)' },
  { value: '', label: 'الكل' },
];

function buildWhatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `2${digits}` : digits.startsWith('20') ? digits : `20${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [statusTab, setStatusTab] = useState<FilterTab>('pending');
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reject Modal state
  const [rejectTarget, setRejectTarget] = useState<AdminProperty | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminProperties({
        status: statusTab,
        q: q.trim() || undefined,
        per_page: 30,
      });
      setProperties(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data ?? []).length);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر جلب طابور العقارات.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusTab, q]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleQuickAction = async (
    prop: AdminProperty,
    action: 'approve' | 'feature' | 'unfeature'
  ) => {
    setBusyId(prop.id);
    setFeedback(null);
    setErrorMessage(null);
    try {
      await moderateAdminProperty(prop.id, { action });
      setFeedback(`تم تحديث حالة العقار (${prop.reference_code}) بنجاح.`);
      await loadQueue();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'تعذر تحديث العقار.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setBusyId(rejectTarget.id);
    setFeedback(null);
    setErrorMessage(null);
    try {
      await moderateAdminProperty(rejectTarget.id, {
        action: 'reject',
        rejection_reason: rejectReason.trim(),
      });
      setFeedback(`تم رفض العقار (${rejectTarget.reference_code}) وتسجيل السبب.`);
      setRejectTarget(null);
      setRejectReason('');
      await loadQueue();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'تعذر رفض العقار.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#9F7753]">
            مراجعة العقارات والتنبيهات الذكية
          </span>
          <h2 className="text-2xl font-extrabold text-[#403E3D]">
            طابور العقارات ({total})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={getAdminExportCsvUrl('properties')}
            className="rounded-full bg-[#F3EAD8] px-5 py-2.5 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/60"
          >
            ⬇ تصدير CSV
          </a>
          <Link
            href="/admin/properties/new"
            className="rounded-full bg-[#9F7753] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#8A6346]"
          >
            + نشر عقار مباشر (OD-01)
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl bg-white p-5 shadow-ambient space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {QUEUE_TABS.map((tab) => {
            const active = statusTab === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatusTab(tab.value)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-[#403E3D] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5C5855] hover:bg-[#F3EAD8] hover:text-[#403E3D]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <input
          type="search"
          placeholder="ابحث بالعنوان أو الكود المرجعي (RES-2026-...)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#403E3D] placeholder:text-[#7D7772] focus:border-[#9F7753] focus:bg-white focus:outline-none"
        />
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]">
          {feedback}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#7D7772] shadow-ambient">
          جارٍ تحميل طابور العقارات...
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          title="لا توجد عقارات مطابقة لهذا التبويب"
          description="اختر تبويباً آخر أو امسح كلمة البحث لعرض العقارات."
        />
      ) : (
        <div className="space-y-4">
          {properties.map((prop) => {
            const phone = prop.contact_whatsapp || prop.contact_phone || prop.user?.phone || '';
            const waText = `مرحباً ${prop.user?.name || ''}، بخصوص إعلانكم على منصة ريزيدنزا سوهاج (${prop.title_ar} - كود ${prop.reference_code}):`;

            return (
              <div
                key={prop.id}
                className="rounded-3xl bg-white p-6 shadow-ambient transition hover:shadow-ambient-lg"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#9F7753] tabular-nums-west">
                        {prop.reference_code}
                      </span>
                      <ModerationStatusBadge status={prop.moderation_status} />
                      <AvailabilityStatusBadge status={prop.availability_status} />
                      {prop.is_featured && (
                        <span className="rounded-full bg-[#F3EAD8] px-3 py-0.5 text-[11px] font-bold text-[#8A6346]">
                          ⭐ عقار مميز
                        </span>
                      )}
                      {prop.is_potential_duplicate && (
                        <span className="rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-bold text-amber-800">
                          ⚠️ تكرار محتمل
                        </span>
                      )}
                      {prop.is_suspicious_price && (
                        <span className="rounded-full bg-red-100 px-3 py-0.5 text-[11px] font-bold text-red-700">
                          ⚠️ سعر غير منطقي
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-[#403E3D]">
                      <Link
                        href={`/admin/properties/${prop.id}`}
                        className="hover:text-[#9F7753]"
                      >
                        {prop.title_ar}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C5855] tabular-nums-west">
                      <span>{TRANSACTION_LABELS[prop.transaction_type]}</span>
                      <span>•</span>
                      <strong className="text-[#403E3D]">{formatPriceEgp(prop.price_egp)}</strong>
                      <span>•</span>
                      <span>{formatAreaSqm(prop.area_sqm)}</span>
                      <span>•</span>
                      <span>{prop.location?.name_ar || 'سوهاج'}</span>
                      <span>•</span>
                      <span>المعلن: {prop.user?.name || 'غير محدد'}</span>
                      <span>•</span>
                      <span>
                        👁 {prop.views_count ?? 0} | 💬 {prop.whatsapp_clicks ?? 0} | 📞{' '}
                        {prop.phone_clicks ?? 0}
                      </span>
                    </div>

                    {prop.rejection_reason && (
                      <p className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                        سبب الرفض: {prop.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {prop.moderation_status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === prop.id}
                        onClick={() => handleQuickAction(prop, 'approve')}
                        className="cursor-pointer rounded-full bg-[#136F48] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0F5939] disabled:opacity-50"
                      >
                        ✓ قبول ونشر
                      </button>
                    )}

                    {prop.moderation_status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === prop.id}
                        onClick={() => {
                          setRejectTarget(prop);
                          setRejectReason(prop.rejection_reason || '');
                        }}
                        className="cursor-pointer rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        ✕ رفض مع سبب
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busyId === prop.id}
                      onClick={() =>
                        handleQuickAction(prop, prop.is_featured ? 'unfeature' : 'feature')
                      }
                      className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        prop.is_featured
                          ? 'bg-[#9F7753] text-white'
                          : 'bg-[#F3EAD8] text-[#403E3D] hover:bg-[#CEB38F]/50'
                      }`}
                    >
                      {prop.is_featured ? '★ إلغاء التمييز' : '☆ تثبيت كمميز'}
                    </button>

                    {phone && (
                      <a
                        href={buildWhatsappUrl(phone, waText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-[#E8F6EF] px-4 py-2 text-xs font-bold text-[#136F48] transition hover:bg-[#136F48] hover:text-white"
                      >
                        مراسلة واتساب
                      </a>
                    )}

                    <Link
                      href={`/admin/properties/${prop.id}`}
                      className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#403E3D] hover:bg-[#F3EAD8]"
                    >
                      التفاصيل
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmReject}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-ambient-lg space-y-4"
          >
            <h3 className="text-base font-extrabold text-[#403E3D]">
              رفض العقار ({rejectTarget.reference_code})
            </h3>
            <p className="text-xs text-[#5C5855]">{rejectTarget.title_ar}</p>
            <div>
              <label className="block text-xs font-bold text-[#403E3D]">
                سبب الرفض (يظهر للمعلن لتصحيح الإعلان) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: يرجى إرفاق صور حقيقية وواضحة للوحدة وتوضيح السعر الإجمالي..."
                className="mt-1.5 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] p-3 text-xs font-medium text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#403E3D]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={busyId === rejectTarget.id}
                className="cursor-pointer rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
