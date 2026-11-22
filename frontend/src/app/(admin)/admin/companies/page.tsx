'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminCompanyItem } from '@/types/api';
import {
  getAdminCompanies,
  getAdminExportCsvUrl,
  updateAdminCompany,
} from '@/lib/api/admin';
import { ApiError, BACKEND_URL } from '@/lib/api/client';

const PLAN_LABELS: Record<'free' | 'partner' | 'enterprise', string> = {
  free: 'الباقة الأساسية (Free)',
  partner: 'باقة شريك تطوير (Partner)',
  enterprise: 'باقة المؤسسات الكبرى (Enterprise)',
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompanyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<AdminCompanyItem | null>(null);
  const [editPlan, setEditPlan] = useState<'free' | 'partner' | 'enterprise'>('free');
  const [editMaxProps, setEditMaxProps] = useState(5);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const res = await getAdminCompanies({ q: q.trim() || undefined, per_page: 40 });
      setCompanies(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data ?? []).length);
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحميل قائمة الشركات.');
    } finally {
      setIsLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const handleToggleVerified = async (company: AdminCompanyItem) => {
    setBusyId(company.id);
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminCompany(company.id, { is_verified: !company.is_verified });
      setFeedback(
        `تم تحديث توثيق شركة (${company.name}) إلى ${
          !company.is_verified ? 'شريك معتمد ✔' : 'غير معتمد'
        }.`
      );
      await loadCompanies();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحديث التوثيق.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setBusyId(editingCompany.id);
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminCompany(editingCompany.id, {
        plan_tier: editPlan,
        max_properties: Number(editMaxProps),
      });
      setFeedback(`تم تحديث باقة وحصة عقارات (${editingCompany.name}) بنجاح.`);
      setEditingCompany(null);
      await loadCompanies();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحديث الباقة.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#9F7753]">
            إدارة المطورين والوكالات العقارية
          </span>
          <h2 className="text-2xl font-extrabold text-[#403E3D]">
            الشركات والباقات والتوثيق ({total})
          </h2>
        </div>

        <a
          href={getAdminExportCsvUrl('companies')}
          className="rounded-full bg-[#F3EAD8] px-5 py-2.5 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/60"
        >
          ⬇ تصدير الشركات CSV
        </a>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-ambient">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم الشركة أو الرابط (slug) أو العنوان..."
          className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
        />
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]">
          {feedback}
        </div>
      )}
      {errorText && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700">{errorText}</div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#7D7772] shadow-ambient">
          جارٍ تحميل الشركات وإحصائيات التفاعل...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {companies.map((comp) => {
            const logoSrc = comp.logo_path
              ? `${BACKEND_URL}/storage/${comp.logo_path.replace(/^\/+/, '')}`
              : null;
            const usedProps = comp.properties_count ?? 0;
            const maxProps = comp.max_properties ?? 5;

            return (
              <div
                key={comp.id}
                className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-ambient space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F2] font-extrabold text-[#9F7753]">
                      {logoSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoSrc} alt={comp.name} className="h-full w-full object-cover" />
                      ) : (
                        comp.name.slice(0, 1)
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#403E3D]">{comp.name}</h3>
                        {comp.is_verified ? (
                          <span className="rounded-full bg-[#E8F6EF] px-2.5 py-0.5 text-[11px] font-bold text-[#136F48]">
                            ✔ شريك معتمد
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#FAF7F2] px-2.5 py-0.5 text-[11px] font-bold text-[#7D7772]">
                            غير معتمد
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5C5855]">
                        المالك: {comp.user?.name || 'غير محدد'} ({comp.user?.phone || comp.phone})
                      </p>
                      <Link
                        href={`/companies/${comp.slug}`}
                        target="_blank"
                        className="text-xs font-bold text-[#9F7753] hover:underline"
                      >
                        /companies/{comp.slug} &#8599;
                      </Link>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#F3EAD8] px-3 py-1 text-[11px] font-bold text-[#403E3D]">
                    {PLAN_LABELS[comp.plan_tier || 'free']}
                  </span>
                </div>

                {/* Quota & Lead Stats */}
                <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-[#FAF7F2] p-3.5 text-center text-xs tabular-nums-west">
                  <div>
                    <span className="block text-[11px] text-[#7D7772]">حصة العقارات</span>
                    <strong className="text-sm font-extrabold text-[#403E3D]">
                      {usedProps} / {maxProps}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-[#7D7772]">مشاهدات الصفحة</span>
                    <strong className="text-sm font-extrabold text-[#403E3D]">
                      {comp.views_count ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[11px] text-[#7D7772]">نقرات واتساب / هاتف</span>
                    <strong className="text-sm font-extrabold text-[#136F48]">
                      {(comp.whatsapp_clicks ?? 0) + (comp.phone_clicks ?? 0)}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#403E3D]/10 pt-3">
                  <button
                    type="button"
                    disabled={busyId === comp.id}
                    onClick={() => handleToggleVerified(comp)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      comp.is_verified
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-[#136F48] text-white hover:bg-[#0F5939]'
                    }`}
                  >
                    {comp.is_verified ? 'إلغاء شارة الاعتماد' : '✔ توثيق كشريك معتمد'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompany(comp);
                      setEditPlan(comp.plan_tier || 'free');
                      setEditMaxProps(comp.max_properties ?? 5);
                    }}
                    className="cursor-pointer rounded-full bg-[#403E3D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#9F7753]"
                  >
                    تعديل الباقة والحد الأقصى
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingCompany && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveQuota}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-ambient-lg space-y-4"
          >
            <h3 className="text-base font-extrabold text-[#403E3D]">
              تعديل باقة وحصة عقارات: {editingCompany.name}
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#403E3D]">فئة الباقة</label>
              <select
                value={editPlan}
                onChange={(e) => {
                  const val = e.target.value as 'free' | 'partner' | 'enterprise';
                  setEditPlan(val);
                  if (val === 'free') setEditMaxProps(5);
                  if (val === 'partner') setEditMaxProps(30);
                  if (val === 'enterprise') setEditMaxProps(200);
                }}
                className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-bold text-[#403E3D]"
              >
                <option value="free">الباقة الأساسية (Free - 5 عقارات)</option>
                <option value="partner">باقة شريك تطوير (Partner - 30 عقار)</option>
                <option value="enterprise">باقة المؤسسات (Enterprise - 200 عقار)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#403E3D]">
                الحد الأقصى للعقارات المسموح بنشرها
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={editMaxProps}
                onChange={(e) => setEditMaxProps(Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-bold text-[#403E3D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#403E3D]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={busyId === editingCompany.id}
                className="cursor-pointer rounded-full bg-[#9F7753] px-6 py-2 text-xs font-bold text-white"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
