'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  AdminProperty,
  AvailabilityStatus,
  ModerationStatus,
  TransactionType,
} from '@/types/api';
import { getAdminProperties } from '@/lib/api/admin';
import {
  AVAILABILITY_STATUS_LABELS,
  AvailabilityStatusBadge,
  MODERATION_STATUS_LABELS,
  ModerationStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { ACCOUNT_TYPE_LABELS, TRANSACTION_LABELS } from '@/lib/api/public';
import { formatAreaSqm, formatPriceEgp } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/client';

const QUEUE_TABS: Array<{ value: ModerationStatus | ''; label: string }> = [
  { value: '', label: 'جميع العقارات' },
  { value: 'pending_review', label: 'طابور المراجعة (قيد المراجعة)' },
  { value: 'approved', label: MODERATION_STATUS_LABELS.approved },
  { value: 'changes_requested', label: MODERATION_STATUS_LABELS.changes_requested },
  { value: 'rejected', label: MODERATION_STATUS_LABELS.rejected },
  { value: 'draft', label: MODERATION_STATUS_LABELS.draft },
];

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [modStatus, setModStatus] = useState<ModerationStatus | ''>('');
  const [availStatus, setAvailStatus] = useState<AvailabilityStatus | ''>('');
  const [txType, setTxType] = useState<TransactionType | ''>('');
  const [trashed, setTrashed] = useState<'with' | 'only' | ''>('');
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminProperties({
        moderation_status: modStatus,
        availability_status: availStatus,
        transaction_type: txType,
        trashed,
        q: q.trim() || undefined,
        per_page: 25,
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
  }, [modStatus, availStatus, txType, trashed, q]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">
            إدارة السجل العقاري وطابور الاعتماد
          </span>
          <h2 className="text-2xl font-extrabold text-[#131E26]">
            جميع العقارات ({total})
          </h2>
        </div>

        <Link
          href="/admin/properties/new"
          className="rounded-full bg-[#C59B4E] px-6 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#A67C33]"
        >
          + نشر عقار مباشر بواسطة الإدارة (OD-01)
        </Link>
      </div>

      {/* Filter Tabs & Search Capsule */}
      <div className="rounded-3xl bg-white p-5 shadow-ambient space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {QUEUE_TABS.map((tab) => {
            const active = modStatus === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setModStatus(tab.value)}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="بحث بالكود المرجعي أو العنوان..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#131E26] placeholder:text-[#78828A] focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none"
          />

          <select
            aria-label="تصفية حسب التوفر"
            value={availStatus}
            onChange={(e) => setAvailStatus(e.target.value as AvailabilityStatus | '')}
            className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
          >
            <option value="">كل حالات التوفر</option>
            {Object.entries(AVAILABILITY_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب المعاملة"
            value={txType}
            onChange={(e) => setTxType(e.target.value as TransactionType | '')}
            className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
          >
            <option value="">للبيع والإيجار</option>
            <option value="sale">للبيع</option>
            <option value="rent">للإيجار</option>
          </select>

          <select
            aria-label="عرض المحذوفات"
            value={trashed}
            onChange={(e) => setTrashed(e.target.value as 'with' | 'only' | '')}
            className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#131E26] focus:outline-none"
          >
            <option value="">العقارات النشطة فقط</option>
            <option value="with">شامل المحذوف ناعماً</option>
            <option value="only">المحذوف ناعماً فقط</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل طابور العقارات...
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
                    {prop.is_featured && (
                      <span className="rounded-full bg-[#F7EFE0] px-3 py-1 text-xs font-bold text-[#8E6722]">
                        مميز ★
                      </span>
                    )}
                    <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#131E26]">
                      {TRANSACTION_LABELS[prop.transaction_type]}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#131E26]">
                    {prop.title_ar}
                  </h3>

                  <p className="text-xs text-[#4A555E]">
                    {prop.location?.name_ar || 'سوهاج'} · {prop.category?.name_ar || ''} —{' '}
                    المعلن:{' '}
                    <strong className="text-[#131E26]">
                      {prop.user?.name || `مستخدم #${prop.user_id}`}
                    </strong>{' '}
                    {prop.user?.account_type
                      ? `(${ACCOUNT_TYPE_LABELS[prop.user.account_type]})`
                      : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 tabular-nums-west">
                  <div className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-end">
                    <span className="block text-base font-extrabold text-[#131E26]">
                      {formatPriceEgp(prop.price_egp)}
                    </span>
                    {prop.installment_price_egp && (
                      <span className="block text-xs font-bold text-[#A67C33]">
                        تقسيط: {formatPriceEgp(prop.installment_price_egp)}
                      </span>
                    )}
                    <span className="text-xs text-[#78828A]">
                      {formatAreaSqm(prop.area_sqm)}
                    </span>
                  </div>

                  <Link
                    href={`/admin/properties/${prop.id}`}
                    className="rounded-full bg-[#131E26] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#C59B4E]"
                  >
                    فحص الملف والبت الإداري &#8592;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد عقارات مطابقة لمعايير الفرز"
          description="جرّب تغيير حالة المراجعة أو مسح كلمة البحث."
        />
      )}
    </div>
  );
}
