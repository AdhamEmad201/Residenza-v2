'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminDashboardStats } from '@/types/api';
import { getAdminDashboard } from '@/lib/api/admin';
import {
  MODERATION_ACTION_LABELS,
  ModerationStatusBadge,
} from '@/components/dashboard/StatusBadges';
import { formatDateAr } from '@/lib/utils/format';
import { ApiError } from '@/lib/api/client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await getAdminDashboard();
        if (active) {
          setStats(res.data ?? null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'تعذر تحميل مؤشرات لوحة الإدارة.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
        جارٍ تحميل مؤشرات القيادة وسجل المراجعات...
      </div>
    );
  }

  if (errorMessage || !stats) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-xs font-bold text-red-700 shadow-ambient">
        {errorMessage || 'تعذر تحميل البيانات.'}
      </div>
    );
  }

  const pendingCount = stats.properties.by_moderation_status?.pending_review ?? 0;
  const approvedCount = stats.properties.by_moderation_status?.approved ?? 0;
  const changesCount = stats.properties.by_moderation_status?.changes_requested ?? 0;
  const rejectedCount = stats.properties.by_moderation_status?.rejected ?? 0;

  return (
    <div className="space-y-8">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums-west">
        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#8E6722]">قيد المراجعة حالياً</span>
          <p className="mt-2 text-3xl font-extrabold text-[#A67C33]">{pendingCount}</p>
          <Link
            href="/admin/properties?moderation_status=pending_review"
            className="mt-3 inline-block text-xs font-bold text-[#131E26] hover:text-[#A67C33]"
          >
            فتح طابور المراجعة &#8592;
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#136F48]">عقارات معتمدة للنشر</span>
          <p className="mt-2 text-3xl font-extrabold text-[#136F48]">{approvedCount}</p>
          <span className="mt-3 block text-xs text-[#78828A]">
            من إجمالي {stats.properties.total} عقار مسجل
          </span>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#131E26]">إجمالي الأعضاء والمعلنين</span>
          <p className="mt-2 text-3xl font-extrabold text-[#131E26]">{stats.users.total}</p>
          <span className="mt-3 block text-xs text-[#78828A]">
            نشط: {stats.users.active} · موقوف: {stats.users.suspended}
          </span>
        </div>

        <div className="rounded-3xl bg-[#F3EDE2] p-6">
          <span className="text-xs font-bold text-[#131E26]">نشر عقار رسمي (OD-01)</span>
          <p className="mt-1 text-xs text-[#4A555E]">
            نشر فوري معتمد بدون طابور انتظار
          </p>
          <Link
            href="/admin/properties/new"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#C59B4E] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#A67C33]"
          >
            + نشر عقار مباشر
          </Link>
        </div>
      </div>

      {/* Secondary Breakdown Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-ambient space-y-4">
          <span className="text-xs font-bold text-[#C59B4E]">توزيع حالات المراجعة</span>
          <h2 className="text-lg font-extrabold text-[#131E26]">ملخص حالة السجل العقاري</h2>
          <dl className="space-y-2.5 text-xs tabular-nums-west">
            <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-2.5">
              <dt className="font-semibold text-[#4A555E]">قيد المراجعة الإدارية</dt>
              <dd className="font-extrabold text-[#A67C33]">{pendingCount}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-2.5">
              <dt className="font-semibold text-[#4A555E]">معتمد للنشر</dt>
              <dd className="font-extrabold text-[#136F48]">{approvedCount}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-2.5">
              <dt className="font-semibold text-[#4A555E]">مطلوب تعديلات</dt>
              <dd className="font-extrabold text-amber-800">{changesCount}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-2.5">
              <dt className="font-semibold text-[#4A555E]">مرفوض</dt>
              <dd className="font-extrabold text-red-700">{rejectedCount}</dd>
            </div>
          </dl>
        </div>

        {/* Recent Moderation Audit Feed */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#C59B4E]">
                سجل التدقيق الزمني (ModerationLog)
              </span>
              <h2 className="text-lg font-extrabold text-[#131E26]">
                أحدث قرارات المراجعة والاعتماد
              </h2>
            </div>
            <Link
              href="/admin/properties"
              className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
            >
              إدارة كل العقارات &#8592;
            </Link>
          </div>

          {stats.recent_moderation_logs.length > 0 ? (
            <ul className="space-y-3">
              {stats.recent_moderation_logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FAF7F2] p-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#131E26]">
                        {MODERATION_ACTION_LABELS[log.action] || log.action}
                      </span>
                      <ModerationStatusBadge status={log.to_status} />
                      {log.property_reference && (
                        <Link
                          href={`/admin/properties/${log.property_id}`}
                          className="font-mono font-bold text-[#A67C33] hover:underline tabular-nums-west"
                        >
                          {log.property_reference}
                        </Link>
                      )}
                    </div>
                    <p className="text-[#4A555E]">
                      {log.property_title || `عقار #${log.property_id}`} — بواسطة:{' '}
                      <strong className="text-[#131E26]">
                        {log.actor_name || `مستخدم #${log.actor_id}`}
                      </strong>
                    </p>
                  </div>

                  <span className="text-[11px] text-[#78828A] tabular-nums-west">
                    {formatDateAr(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-[#FAF7F2] p-6 text-center text-xs text-[#78828A]">
              لا توجد حركات مراجعة مسجلة بعد.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
