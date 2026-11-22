'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AdminAreaItem, AdminAuditLogItem } from '@/types/api';
import {
  createAdminArea,
  deleteAdminArea,
  getAdminAreas,
  getAdminAuditLogs,
  updateAdminArea,
  updateAdminSiteSettings,
} from '@/lib/api/admin';
import { getPublicSiteConfig } from '@/lib/api/public';
import { formatDateAr } from '@/lib/utils/format';
import { ApiError } from '@/lib/api/client';

export default function AdminSettingsAndAuditPage() {
  const [areas, setAreas] = useState<AdminAreaItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // New area state
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('سوهاج');

  // Announcement & Hero settings state
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [areasRes, logsRes, siteCfg] = await Promise.all([
        getAdminAreas(),
        getAdminAuditLogs(1),
        getPublicSiteConfig(),
      ]);
      setAreas(areasRes.data ?? []);
      setAuditLogs(logsRes.data ?? []);
      if (siteCfg) {
        setAnnouncementText(siteCfg.announcement_bar?.text || '');
        setAnnouncementActive(Boolean(siteCfg.announcement_bar?.active));
        setHeroTitle(siteCfg.hero_banner?.title || '');
        setHeroSubtitle(siteCfg.hero_banner?.subtitle || '');
      }
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحميل الإعدادات.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setFeedback(null);
    setErrorText(null);
    try {
      await createAdminArea({
        name: newAreaName.trim(),
        city: newAreaCity.trim() || 'سوهاج',
        is_active: true,
      });
      setNewAreaName('');
      setFeedback('تم إضافة المنطقة بنجاح.');
      await loadAll();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر إضافة المنطقة.');
    }
  };

  const handleToggleArea = async (area: AdminAreaItem) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminArea(area.id, { is_active: !area.is_active });
      await loadAll();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر تحديث المنطقة.');
    }
  };

  const handleDeleteArea = async (areaId: number) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await deleteAdminArea(areaId);
      setFeedback('تم حذف المنطقة.');
      await loadAll();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر حذف المنطقة.');
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setFeedback(null);
    setErrorText(null);
    try {
      const fd = new FormData();
      fd.append('announcement_bar_text', announcementText);
      fd.append('announcement_bar_active', announcementActive ? '1' : '0');
      fd.append('hero_banner_title', heroTitle);
      fd.append('hero_banner_subtitle', heroSubtitle);
      if (heroImageFile) {
        fd.append('hero_banner_image', heroImageFile);
      }
      await updateAdminSiteSettings(fd);
      setFeedback('تم حفظ إعدادات الشريط الإعلاني والواجهة بنجاح.');
      setHeroImageFile(null);
      await loadAll();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'تعذر حفظ إعدادات الواجهة.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8">
      {feedback && (
        <div className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]">
          {feedback}
        </div>
      )}
      {errorText && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700">{errorText}</div>
      )}

      {/* Grid: Site Settings + Dynamic Areas */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Announcement Bar & Hero Banner Settings (6 cols) */}
        <form
          onSubmit={handleSaveSiteSettings}
          className="rounded-3xl bg-white p-6 shadow-ambient sm:p-7 space-y-5 lg:col-span-6"
        >
          <div>
            <span className="text-xs font-bold text-[#9F7753]">إعدادات العرض العام</span>
            <h2 className="mt-1 text-xl font-extrabold text-[#403E3D]">
              الشريط الإعلاني وبانر الصفحة الرئيسية
            </h2>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] p-4">
            <span className="text-xs font-bold text-[#403E3D]">
              تفعيل الشريط الإعلاني العلوي
            </span>
            <input
              type="checkbox"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="h-4 w-4 accent-[#9F7753]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#403E3D]">
              نص الشريط الإعلاني العلوي
            </label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="مثال: طرح مرحلة جديدة من عقارات سوهاج الجديدة بتقسيط حتى 7 سنوات..."
              className="mt-1.5 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#403E3D]">
              عنوان البانر الرئيسي (Hero Title)
            </label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="حيث تلتقي فخامة المعمار بصفاء الاستثمار في سوهاج"
              className="mt-1.5 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#403E3D]">
              الوصف الفرعي للبانر (Hero Subtitle)
            </label>
            <textarea
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-medium text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#403E3D]">
              تحديث صورة البانر (JPG / PNG / WebP فقط — يمنع SVG)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
              className="mt-1.5 block w-full text-xs text-[#5C5855]"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="cursor-pointer rounded-full bg-[#9F7753] px-7 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#8A6346] disabled:opacity-50"
          >
            {isSavingSettings ? 'جارٍ الحفظ...' : 'حفظ إعدادات الواجهة'}
          </button>
        </form>

        {/* Dynamic Sohag Areas Manager (6 cols) */}
        <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-7 space-y-5 lg:col-span-6">
          <div>
            <span className="text-xs font-bold text-[#9F7753]">النطاق الجغرافي الديناميكي</span>
            <h2 className="mt-1 text-xl font-extrabold text-[#403E3D]">
              المناطق والأحياء المعتمدة ({areas.length})
            </h2>
          </div>

          <form onSubmit={handleAddArea} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              required
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="اسم المنطقة أو الحي (مثلاً: حي الكوثر)"
              className="flex-1 rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              value={newAreaCity}
              onChange={(e) => setNewAreaCity(e.target.value)}
              placeholder="المدينة"
              className="w-28 rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3 py-2.5 text-xs font-bold text-[#403E3D] focus:outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-[#403E3D] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#9F7753]"
            >
              + إضافة
            </button>
          </form>

          <div className="max-h-80 space-y-2 overflow-y-auto pe-1">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#403E3D]">{area.name}</span>
                  <span className="ms-2 text-[#7D7772]">({area.city})</span>
                  <span className="ms-2 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#9F7753] tabular-nums-west">
                    {area.search_count} طلب
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleArea(area)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold ${
                      area.is_active
                        ? 'bg-[#E8F6EF] text-[#136F48]'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {area.is_active ? 'نشط' : 'مخفي'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteArea(area.id)}
                    className="cursor-pointer rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Audit Log Table */}
      <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-7">
        <span className="text-xs font-bold text-[#9F7753]">الشفافية والحوكمة</span>
        <h2 className="mt-1 text-xl font-extrabold text-[#403E3D]">
          سجل نشاطات الإدارة (Admin Audit Log)
        </h2>

        {isLoading ? (
          <p className="py-8 text-center text-xs text-[#7D7772]">جارٍ تحميل السجل...</p>
        ) : auditLogs.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#7D7772]">لا توجد عمليات مسجلة بعد.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#FAF7F2] text-[#5C5855]">
                <tr>
                  <th className="px-4 py-3 text-start font-bold">المدير</th>
                  <th className="px-4 py-3 text-start font-bold">الإجراء</th>
                  <th className="px-4 py-3 text-start font-bold">العنصر المستهدف</th>
                  <th className="px-4 py-3 text-start font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#403E3D]/10">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="px-4 py-3 font-bold text-[#403E3D]">
                      {log.admin?.name || `Admin #${log.admin_id}`}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#9F7753]">{log.action}</td>
                    <td className="px-4 py-3 text-[#5C5855] tabular-nums-west">
                      {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                    </td>
                    <td className="px-4 py-3 text-[#7D7772] tabular-nums-west">
                      {formatDateAr(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
