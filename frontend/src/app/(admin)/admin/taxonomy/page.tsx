'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  Category,
  Location,
  LocationType,
  PropertyType,
} from '@/types/api';
import {
  createAdminCategory,
  createAdminLocation,
  deleteAdminCategory,
  deleteAdminLocation,
  getAdminCategories,
  getAdminLocations,
  updateAdminCategory,
  updateAdminLocation,
} from '@/lib/api/admin';
import { LOCATION_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/api/public';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

export default function AdminTaxonomyPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'locations'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Category Form State
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catPropertyType, setCatPropertyType] = useState<PropertyType>('residential');
  const [catParentId, setCatParentId] = useState('');

  // Location Form State
  const [locNameAr, setLocNameAr] = useState('');
  const [locNameEn, setLocNameEn] = useState('');
  const [locSlug, setLocSlug] = useState('');
  const [locType, setLocType] = useState<LocationType>('district');
  const [locParentId, setLocParentId] = useState('');

  const loadTaxonomy = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [catsRes, locsRes] = await Promise.all([
        getAdminCategories(),
        getAdminLocations(),
      ]);
      setCategories(catsRes.data ?? []);
      setLocations(locsRes.data ?? []);
    } catch (error) {
      setErrorText(
        error instanceof ApiError
          ? error.message
          : 'تعذر تحميل بيانات التصنيفات والمناطق.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setErrorText(null);
    try {
      await createAdminCategory({
        name_ar: catNameAr.trim(),
        name_en: catNameEn.trim() || null,
        slug: catSlug.trim(),
        property_type: catPropertyType,
        parent_id: catParentId ? Number(catParentId) : null,
        is_active: true,
      });
      setCatNameAr('');
      setCatNameEn('');
      setCatSlug('');
      setFeedback('تم إنشاء التصنيف العقاري بنجاح.');
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر إنشاء التصنيف العقاري.'
      );
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminCategory(cat.id, {
        name_ar: cat.name_ar,
        slug: cat.slug,
        property_type: cat.property_type,
        parent_id: cat.parent_id ?? null,
        is_active: !cat.is_active,
      });
      setFeedback(`تم تحديث حالة التصنيف (${cat.name_ar}).`);
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر تحديث التصنيف.'
      );
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`هل أنت متأكد من حذف التصنيف «${cat.name_ar}»؟`)) return;
    setFeedback(null);
    setErrorText(null);
    try {
      await deleteAdminCategory(cat.id);
      setFeedback('تم حذف التصنيف بنجاح.');
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر حذف التصنيف (قد يحتوي على عقارات مرتبطة).'
      );
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setErrorText(null);
    try {
      await createAdminLocation({
        name_ar: locNameAr.trim(),
        name_en: locNameEn.trim() || null,
        slug: locSlug.trim(),
        type: locType,
        parent_id: locParentId ? Number(locParentId) : null,
        is_active: true,
      });
      setLocNameAr('');
      setLocNameEn('');
      setLocSlug('');
      setFeedback('تمت إضافة الموقع الجغرافي في سوهاج بنجاح.');
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر إضافة الموقع الجغرافي.'
      );
    }
  };

  const handleToggleLocationActive = async (loc: Location) => {
    setFeedback(null);
    setErrorText(null);
    try {
      await updateAdminLocation(loc.id, {
        name_ar: loc.name_ar,
        slug: loc.slug,
        type: loc.type,
        parent_id: loc.parent_id ?? null,
        is_active: !loc.is_active,
      });
      setFeedback(`تم تحديث حالة المنطقة (${loc.name_ar}).`);
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر تحديث المنطقة.'
      );
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    if (!window.confirm(`هل أنت متأكد من حذف المنطقة «${loc.name_ar}»؟`)) return;
    setFeedback(null);
    setErrorText(null);
    try {
      await deleteAdminLocation(loc.id);
      setFeedback('تم حذف المنطقة بنجاح.');
      await loadTaxonomy();
    } catch (error) {
      setErrorText(
        error instanceof ApiError ? error.message : 'تعذر حذف المنطقة (قد تتبعها مناطق أو عقارات).'
      );
    }
  };

  const rootCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-8">
      {/* Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">
            البنية التصنيفية والجغرافية
          </span>
          <h2 className="text-2xl font-extrabold text-[#131E26]">
            إدارة التصنيفات ومناطق محافظة سوهاج
          </h2>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-[#FAF7F2] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition ${
              activeTab === 'categories'
                ? 'bg-[#131E26] text-white shadow-xs'
                : 'text-[#4A555E] hover:text-[#131E26]'
            }`}
          >
            التصنيفات العقارية ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition ${
              activeTab === 'locations'
                ? 'bg-[#131E26] text-white shadow-xs'
                : 'text-[#4A555E] hover:text-[#131E26]'
            }`}
          >
            مناطق سوهاج ({locations.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
        >
          {feedback}
        </div>
      )}

      {errorText && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {errorText}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل البيانات...
        </div>
      ) : activeTab === 'categories' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Create Category Form */}
          <form
            onSubmit={handleCreateCategory}
            className="rounded-3xl bg-white p-6 shadow-ambient space-y-4 lg:col-span-4"
          >
            <h3 className="text-lg font-extrabold text-[#131E26]">
              إضافة تصنيف عقاري جديد
            </h3>

            <Input
              label="الاسم بالعربية"
              required
              placeholder="مثال: شقق دوبلكس"
              value={catNameAr}
              onChange={(e) => setCatNameAr(e.target.value)}
            />

            <Input
              label="الاسم بالإنجليزية (اختياري)"
              dir="ltr"
              placeholder="Duplex Apartments"
              value={catNameEn}
              onChange={(e) => setCatNameEn(e.target.value)}
            />

            <Input
              label="المعرف النصي (Slug)"
              required
              dir="ltr"
              placeholder="duplex-apartments"
              value={catSlug}
              onChange={(e) => setCatSlug(e.target.value)}
            />

            <Select
              label="القطاع العقاري"
              value={catPropertyType}
              onChange={(e) => setCatPropertyType(e.target.value as PropertyType)}
              options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <Select
              label="التصنيف الأب (اختياري — بحد أقصى مستويين)"
              placeholderOption="تصنيف رئيسي (مستوى أول)"
              value={catParentId}
              onChange={(e) => setCatParentId(e.target.value)}
              options={rootCategories.map((c) => ({
                value: c.id,
                label: c.name_ar,
              }))}
            />

            <Button type="submit" variant="gold" size="md" fullWidth>
              حفظ التصنيف
            </Button>
          </form>

          {/* Categories List */}
          <div className="space-y-3 lg:col-span-8">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-ambient"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-[#131E26]">
                      {cat.name_ar}
                    </span>
                    <span className="rounded-full bg-[#F7EFE0] px-3 py-0.5 text-xs font-bold text-[#8E6722]">
                      {PROPERTY_TYPE_LABELS[cat.property_type]}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        cat.is_active
                          ? 'bg-[#E8F6EF] text-[#136F48]'
                          : 'bg-[#F3EDE2] text-[#78828A]'
                      }`}
                    >
                      {cat.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#78828A]">{cat.slug}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleCategoryActive(cat)}
                    className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
                  >
                    {cat.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCategory(cat)}
                    className="cursor-pointer rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-700 hover:text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Create Location Form */}
          <form
            onSubmit={handleCreateLocation}
            className="rounded-3xl bg-white p-6 shadow-ambient space-y-4 lg:col-span-4"
          >
            <h3 className="text-lg font-extrabold text-[#131E26]">
              إضافة منطقة جغرافية في سوهاج
            </h3>

            <Input
              label="اسم المنطقة بالعربية"
              required
              placeholder="مثال: الحي الثالث — سوهاج الجديدة"
              value={locNameAr}
              onChange={(e) => setLocNameAr(e.target.value)}
            />

            <Input
              label="الاسم بالإنجليزية (اختياري)"
              dir="ltr"
              placeholder="District 3"
              value={locNameEn}
              onChange={(e) => setLocNameEn(e.target.value)}
            />

            <Input
              label="المعرف النصي (Slug)"
              required
              dir="ltr"
              placeholder="new-sohag-district-3"
              value={locSlug}
              onChange={(e) => setLocSlug(e.target.value)}
            />

            <Select
              label="المستوى الإداري"
              value={locType}
              onChange={(e) => setLocType(e.target.value as LocationType)}
              options={Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <Select
              label="النطاق الإداري الأب"
              placeholderOption="جذر (محافظة)"
              value={locParentId}
              onChange={(e) => setLocParentId(e.target.value)}
              options={locations.map((l) => ({
                value: l.id,
                label: `${l.name_ar} (${LOCATION_TYPE_LABELS[l.type]})`,
              }))}
            />

            <Button type="submit" variant="gold" size="md" fullWidth>
              حفظ المنطقة الجغرافية
            </Button>
          </form>

          {/* Locations List */}
          <div className="space-y-3 lg:col-span-8">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-ambient"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-[#131E26]">
                      {loc.name_ar}
                    </span>
                    <span className="rounded-full bg-[#F7EFE0] px-3 py-0.5 text-xs font-bold text-[#8E6722]">
                      {LOCATION_TYPE_LABELS[loc.type]}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        loc.is_active
                          ? 'bg-[#E8F6EF] text-[#136F48]'
                          : 'bg-[#F3EDE2] text-[#78828A]'
                      }`}
                    >
                      {loc.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#78828A]">{loc.slug}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleLocationActive(loc)}
                    className="cursor-pointer rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
                  >
                    {loc.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteLocation(loc)}
                    className="cursor-pointer rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-700 hover:text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
