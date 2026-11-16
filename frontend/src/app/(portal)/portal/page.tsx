'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  AvailabilityStatus,
  ModerationStatus,
  PortalProperty,
} from '@/types/api';
import {
  deletePortalProperty,
  getPortalProperties,
  resubmitPortalProperty,
  submitPortalProperty,
  updatePortalPropertyAvailability,
} from '@/lib/api/portal';
import {
  AVAILABILITY_STATUS_LABELS,
  AvailabilityStatusBadge,
  MODERATION_STATUS_LABELS,
  ModerationStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { PAYMENT_METHOD_LABELS, TRANSACTION_LABELS } from '@/lib/api/public';
import { formatAreaSqm, formatPriceEgp } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';

const STATUS_TABS: Array<{ value: ModerationStatus | ''; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'approved', label: MODERATION_STATUS_LABELS.approved },
  { value: 'pending_review', label: MODERATION_STATUS_LABELS.pending_review },
  { value: 'changes_requested', label: MODERATION_STATUS_LABELS.changes_requested },
  { value: 'draft', label: MODERATION_STATUS_LABELS.draft },
  { value: 'rejected', label: MODERATION_STATUS_LABELS.rejected },
];

export default function PortalDashboardPage() {
  const [properties, setProperties] = useState<PortalProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [modFilter, setModFilter] = useState<ModerationStatus | ''>('');
  const [availFilter, setAvailFilter] = useState<AvailabilityStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getPortalProperties({
        moderation_status: modFilter,
        availability_status: availFilter,
        per_page: 25,
      });
      setProperties(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data ?? []).length);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر تحميل عقاراتك حالياً.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [modFilter, availFilter]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const handleQuickSubmit = async (id: number, isResubmit = false) => {
    setActionFeedback(null);
    setErrorMessage(null);
    try {
      if (isResubmit) {
        await resubmitPortalProperty(id);
        setActionFeedback('تمت إعادة إرسال العقار إلى إدارة المراجعة بنجاح.');
      } else {
        await submitPortalProperty(id);
        setActionFeedback('تم إرسال مسودة العقار للمراجعة بنجاح.');
      }
      await loadProperties();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر إرسال العقار للمراجعة.'
      );
    }
  };

  const handleAvailabilityChange = async (
    id: number,
    nextStatus: AvailabilityStatus
  ) => {
    setActionFeedback(null);
    setErrorMessage(null);
    try {
      await updatePortalPropertyAvailability(id, nextStatus);
      setActionFeedback('تم تحديث حالة توفر العقار بنجاح.');
      await loadProperties();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر تحديث حالة التوفر.'
      );
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`هل ترغب في حذف العقار «${title}»؟`)) {
      return;
    }
    setActionFeedback(null);
    setErrorMessage(null);
    try {
      await deletePortalProperty(id);
      setActionFeedback('تم حذف العقار بنجاح.');
      await loadProperties();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'تعذر حذف العقار.');
    }
  };

  const approvedCount = properties.filter((p) => p.moderation_status === 'approved').length;
  const pendingCount = properties.filter(
    (p) => p.moderation_status === 'pending_review'
  ).length;
  const changesCount = properties.filter(
    (p) => p.moderation_status === 'changes_requested'
  ).length;

  return (
    <div className="space-y-8">
      {/* Summary KPI Cards + Add Property CTA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-ambient tabular-nums-west">
          <span className="text-xs font-bold text-[#78828A]">إجمالي عقاراتي</span>
          <p className="mt-2 text-3xl font-extrabold text-[#131E26]">{total}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-ambient tabular-nums-west">
          <span className="text-xs font-bold text-[#136F48]">معتمد للنشر</span>
          <p className="mt-2 text-3xl font-extrabold text-[#136F48]">{approvedCount}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-ambient tabular-nums-west">
          <span className="text-xs font-bold text-[#8E6722]">قيد المراجعة / تعديلات</span>
          <p className="mt-2 text-3xl font-extrabold text-[#A67C33]">
            {pendingCount + changesCount}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-[#F3EDE2] p-6">
          <span className="text-xs font-bold text-[#131E26]">طرح وحدة عقارية جديدة</span>
          <Link
            href="/portal/properties/new"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-[#C59B4E] px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#A67C33]"
          >
            + إضافة عقار جديد
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-ambient">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = modFilter === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setModFilter(tab.value)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-[#131E26] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#4A555E] hover:bg-[#F3EDE2] hover:text-[#131E26]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="avail-filter" className="text-xs font-bold text-[#78828A]">
            التوفر:
          </label>
          <select
            id="avail-filter"
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value as AvailabilityStatus | '')}
            className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#131E26] focus:outline-none"
          >
            <option value="">كل حالات التوفر</option>
            {Object.entries(AVAILABILITY_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
        >
          {actionFeedback}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Properties List */}
      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل عقاراتك...
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-4">
          {properties.map((prop) => (
            <article
              key={prop.id}
              className="rounded-3xl bg-white p-6 shadow-ambient transition hover:shadow-ambient-lg"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-[#A67C33] tabular-nums-west">
                      {prop.reference_code}
                    </span>
                    <ModerationStatusBadge status={prop.moderation_status} />
                    <AvailabilityStatusBadge status={prop.availability_status} />
                    <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#131E26]">
                      {TRANSACTION_LABELS[prop.transaction_type]}
                      {prop.payment_method
                        ? ` · ${PAYMENT_METHOD_LABELS[prop.payment_method]}`
                        : ''}
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold text-[#131E26]">
                    {prop.title_ar}
                  </h2>

                  <p className="text-xs text-[#4A555E]">
                    {prop.location?.name_ar || 'سوهاج'} · {prop.category?.name_ar || ''} —{' '}
                    {prop.address_details_ar}
                  </p>
                </div>

                {/* Price & Area Summary */}
                <div className="rounded-2xl bg-[#FAF7F2] px-5 py-3 text-end tabular-nums-west">
                  <span className="block text-xs font-bold text-[#78828A]">
                    السعر / المساحة
                  </span>
                  <span className="text-lg font-extrabold text-[#131E26]">
                    {formatPriceEgp(prop.price_egp)}
                  </span>
                  {prop.installment_price_egp && (
                    <span className="block text-xs font-bold text-[#A67C33]">
                      تقسيط: {formatPriceEgp(prop.installment_price_egp)}
                    </span>
                  )}
                  <span className="mt-1 block text-xs font-semibold text-[#4A555E]">
                    {formatAreaSqm(prop.area_sqm)}
                  </span>
                </div>
              </div>

              {/* Rejection / Changes Requested Notice */}
              {prop.rejection_reason &&
                (prop.moderation_status === 'changes_requested' ||
                  prop.moderation_status === 'rejected') && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
                    <strong className="font-bold">ملاحظات فريق المراجعة: </strong>
                    {prop.rejection_reason}
                  </div>
                )}

              {/* Action Controls Bar */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3EDE2] pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/portal/properties/${prop.id}/edit`}
                    className="rounded-full bg-[#131E26] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#1E2E3A]"
                  >
                    تعديل البيانات والصور والمستندات
                  </Link>

                  {prop.moderation_status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => void handleQuickSubmit(prop.id, false)}
                      className="cursor-pointer rounded-full bg-[#C59B4E] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#A67C33]"
                    >
                      إرسال للمراجعة الآن
                    </button>
                  )}

                  {prop.moderation_status === 'changes_requested' && (
                    <button
                      type="button"
                      onClick={() => void handleQuickSubmit(prop.id, true)}
                      className="cursor-pointer rounded-full bg-[#C59B4E] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#A67C33]"
                    >
                      إعادة إرسال للمراجعة
                    </button>
                  )}

                  {prop.moderation_status === 'approved' &&
                    prop.availability_status === 'available' && (
                      <Link
                        href={`/properties/${prop.slug}`}
                        className="rounded-full bg-[#E8F6EF] px-4 py-2 text-xs font-bold text-[#136F48] transition hover:bg-[#136F48] hover:text-white"
                      >
                        معاينة الإعلان العام &#8592;
                      </Link>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="تغيير حالة التوفر"
                    value={prop.availability_status}
                    onChange={(e) =>
                      void handleAvailabilityChange(
                        prop.id,
                        e.target.value as AvailabilityStatus
                      )
                    }
                    className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#131E26] focus:outline-none"
                  >
                    {Object.entries(AVAILABILITY_STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        حالة التوفر: {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleDelete(prop.id, prop.title_ar)}
                    className="cursor-pointer rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-700 hover:text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد عقارات مسجلة في حسابك حالياً"
          description="ابدأ بإضافة أول عقار لك في محافظة سوهاج أو مدينة سوهاج الجديدة وسيقوم فريقنا بمراجعته واعتماده للنشر."
          actionLabel="إضافة عقار جديد"
          actionHref="/portal/properties/new"
        />
      )}
    </div>
  );
}
