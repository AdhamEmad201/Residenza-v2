'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminOverviewStats, AdminProperty } from '@/types/api';
import { getAdminOverview, getAdminProperties } from '@/lib/api/admin';
import { formatPriceEgp } from '@/lib/utils/format';
import { ApiError } from '@/lib/api/client';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [pendingQueue, setPendingQueue] = useState<AdminProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const [ovRes, propRes] = await Promise.all([
          getAdminOverview(),
          getAdminProperties({ status: 'pending', per_page: 5 }),
        ]);
        if (active) {
          setOverview(ovRes.data ?? null);
          setPendingQueue(propRes.data ?? []);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : 'تعذر تحميل مؤشرات غرفة التحكم الإدارية.'
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
      <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#403E3D] shadow-ambient">
        جارٍ تحميل مؤشرات غرفة التحكم والنبض الحي للمنصة...
      </div>
    );
  }

  if (errorMessage || !overview) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-xs font-bold text-red-700 shadow-ambient">
        {errorMessage || 'تعذر تحميل البيانات.'}
      </div>
    );
  }

  const totalInteractions =
    overview.engagement.total_whatsapp_clicks + overview.engagement.total_phone_clicks;

  return (
    <div className="space-y-8">
      {/* 6 Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 tabular-nums-west">
        {/* 1. Live Online Users */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#136F48]">المتواجدون الآن (آخر 5 دقائق)</span>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#16A34A]" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#403E3D]">
            {overview.online_users_count}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {overview.online_users.length > 0 ? (
              overview.online_users.slice(0, 4).map((u) => (
                <span
                  key={u.id}
                  className="rounded-full bg-[#E8F6EF] px-2.5 py-0.5 text-[11px] font-bold text-[#136F48]"
                >
                  {u.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#7D7772]">لا يوجد أعضاء نشطون حالياً</span>
            )}
          </div>
        </div>

        {/* 2. Total Accounts & Companies */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#9F7753]">إجمالي الحسابات والشركات</span>
          <p className="mt-2 text-3xl font-extrabold text-[#403E3D]">{overview.total_users}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-[#5C5855]">
            <span>
              الشركات: <strong>{overview.companies.total}</strong> (معتمد:{' '}
              <strong className="text-[#136F48]">{overview.companies.verified}</strong>)
            </span>
            <Link href="/admin/users" className="font-bold text-[#9F7753] hover:text-[#403E3D]">
              إدارة &#8592;
            </Link>
          </div>
        </div>

        {/* 3. Pending & Stale Properties */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#9F7753]">عقارات بانتظار المراجعة</span>
          <p className="mt-2 text-3xl font-extrabold text-[#9F7753]">
            {overview.properties.pending}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-[#5C5855]">
            <span>
              مقبول: <strong>{overview.properties.approved}</strong> · قديم (+45 يوم):{' '}
              <strong className="text-amber-700">{overview.properties.stale}</strong>
            </span>
            <Link
              href="/admin/properties"
              className="font-bold text-[#403E3D] hover:text-[#9F7753]"
            >
              طابور المراجعة &#8592;
            </Link>
          </div>
        </div>

        {/* 4. WhatsApp & Phone Clicks */}
        <div className="rounded-3xl bg-[#403E3D] p-6 text-white shadow-ambient">
          <span className="text-xs font-bold text-[#CEB38F]">
            إجمالي نقرات الواتساب والاتصال
          </span>
          <p className="mt-2 text-3xl font-extrabold text-white">{totalInteractions}</p>
          <p className="mt-3 text-xs text-[#F3EAD8]/85">
            واتساب: <strong>{overview.engagement.total_whatsapp_clicks}</strong> · اتصال:{' '}
            <strong>{overview.engagement.total_phone_clicks}</strong> · مشاهدات:{' '}
            <strong>{overview.engagement.total_views}</strong>
          </p>
        </div>

        {/* 5. Open Reports */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient">
          <span className="text-xs font-bold text-red-700">بلاغات مفتوحة للمراجعة</span>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{overview.open_reports_count}</p>
          <Link
            href="/admin/leads-reports"
            className="mt-3 inline-block text-xs font-bold text-[#403E3D] hover:text-[#9F7753]"
          >
            مراجعة بلاغات الزوار &#8592;
          </Link>
        </div>

        {/* 6. New Buyer Requests */}
        <div className="rounded-3xl bg-[#F3EAD8] p-6 shadow-ambient">
          <span className="text-xs font-bold text-[#8A6346]">طلبات مشترين جديدة (اطلب عقارك)</span>
          <p className="mt-2 text-3xl font-extrabold text-[#403E3D]">
            {overview.new_buyer_requests_count}
          </p>
          <Link
            href="/admin/leads-reports"
            className="mt-3 inline-block text-xs font-bold text-[#9F7753] hover:text-[#403E3D]"
          >
            توجيه الطلبات للشركات &#8592;
          </Link>
        </div>
      </div>

      {/* Two-Column Breakdown: Quick Pending Properties Queue + Top Areas */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Quick Pending Queue (7 cols) */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-7 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#9F7753]">المراجعة السريعة</span>
              <h2 className="mt-1 text-lg font-extrabold text-[#403E3D]">
                أحدث عقارات بانتظار الاعتماد ({overview.properties.pending})
              </h2>
            </div>
            <Link
              href="/admin/properties"
              className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#403E3D] hover:bg-[#F3EAD8]"
            >
              عرض الكل &#8592;
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {pendingQueue.length > 0 ? (
              pendingQueue.map((prop) => (
                <div
                  key={prop.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FAF7F2] p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#9F7753] tabular-nums-west">
                        {prop.reference_code}
                      </span>
                      {prop.is_potential_duplicate && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          ⚠️ تكرار محتمل
                        </span>
                      )}
                      {prop.is_suspicious_price && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                          ⚠️ سعر غير منطقي
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#403E3D]">{prop.title_ar}</p>
                    <p className="text-xs text-[#5C5855]">
                      {prop.user?.name || 'معلن'} · {formatPriceEgp(prop.price_egp)}
                    </p>
                  </div>

                  <Link
                    href="/admin/properties"
                    className="rounded-full bg-[#403E3D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#9F7753]"
                  >
                    مراجعة واتخاذ قرار
                  </Link>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs font-bold text-[#7D7772]">
                لا توجد عقارات معلقة في طابور المراجعة حالياً ✓
              </p>
            )}
          </div>
        </div>

        {/* Top Areas Breakdown (5 cols) */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-7 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#9F7753]">مؤشر الطلب الجغرافي</span>
              <h2 className="mt-1 text-lg font-extrabold text-[#403E3D]">
                أكثر مناطق سوهاج طلباً وبحثاً
              </h2>
            </div>
            <Link
              href="/admin/settings"
              className="rounded-full bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-bold text-[#9F7753] hover:bg-[#F3EAD8]"
            >
              إدارة المناطق
            </Link>
          </div>

          <div className="mt-5 space-y-3 tabular-nums-west">
            {overview.top_areas.length > 0 ? (
              overview.top_areas.map((area, idx) => (
                <div
                  key={area.id}
                  className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3EAD8] text-xs font-extrabold text-[#9F7753]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-[#403E3D]">{area.name}</p>
                      <p className="text-[11px] text-[#7D7772]">{area.city}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#9F7753] shadow-2xs">
                    {area.search_count} طلب/بحث
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-[#7D7772]">لا توجد بيانات مناطق بعد.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
