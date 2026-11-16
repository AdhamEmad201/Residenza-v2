'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Location } from '@/types/api';
import {
  FINISHING_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PROPERTY_TYPE_LABELS,
  PropertySearchFilters,
  TRANSACTION_LABELS,
} from '@/lib/api/public';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export interface PropertyFiltersProps {
  categories: Category[];
  locations: Location[];
  initialFilters: PropertySearchFilters;
}

function flattenCategoryOptions(categories: Category[]): SelectOption[] {
  const options: SelectOption[] = [];
  for (const cat of categories) {
    options.push({ value: cat.id, label: cat.name_ar });
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        options.push({ value: child.id, label: `— ${child.name_ar}` });
      }
    }
  }
  return options;
}

function flattenLocationOptions(locations: Location[], depth = 0): SelectOption[] {
  const options: SelectOption[] = [];
  const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
  for (const loc of locations) {
    options.push({
      value: loc.id,
      label: `${prefix}${loc.name_ar}`,
    });
    if (loc.children && loc.children.length > 0) {
      options.push(...flattenLocationOptions(loc.children, depth + 1));
    }
  }
  return options;
}

export function PropertyFilters({
  categories,
  locations,
  initialFilters,
}: PropertyFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertySearchFilters>({
    q: initialFilters.q || '',
    transaction_type: initialFilters.transaction_type || '',
    property_type: initialFilters.property_type || '',
    category_id: initialFilters.category_id || '',
    location_id: initialFilters.location_id || '',
    payment_method: initialFilters.payment_method || '',
    min_price: initialFilters.min_price || '',
    max_price: initialFilters.max_price || '',
    min_area: initialFilters.min_area || '',
    max_area: initialFilters.max_area || '',
    bedrooms: initialFilters.bedrooms || '',
    bathrooms: initialFilters.bathrooms || '',
    finishing_type: initialFilters.finishing_type || '',
    sort: initialFilters.sort || 'newest',
  });

  const categoryOptions = flattenCategoryOptions(categories);
  const locationOptions = flattenLocationOptions(locations);

  const handleFieldChange = (key: keyof PropertySearchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        if (key === 'sort' && value === 'newest') {
          continue;
        }
        params.set(key, String(value).trim());
      }
    }
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : '/properties');
  };

  const handleReset = () => {
    const clean: PropertySearchFilters = {
      q: '',
      transaction_type: '',
      property_type: '',
      category_id: '',
      location_id: '',
      payment_method: '',
      min_price: '',
      max_price: '',
      min_area: '',
      max_area: '',
      bedrooms: '',
      bathrooms: '',
      finishing_type: '',
      sort: 'newest',
    };
    setFilters(clean);
    router.push('/properties');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-ambient space-y-5"
      aria-label="تصفية العقارات"
    >
      <div className="flex items-center justify-between pb-2">
        <div>
          <span className="text-[11px] font-bold text-[#C59B4E]">
            بحث مخصص
          </span>
          <h2 className="text-lg font-bold text-[#131E26]">
            تصفية العقارات
          </h2>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer rounded-full bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-bold text-[#A67C33] transition hover:bg-[#F7EFE0]"
        >
          إعادة ضبط
        </button>
      </div>

      {/* Transaction Quick Pill Toggle */}
      <div className="grid grid-cols-3 gap-1.5 rounded-full bg-[#FAF7F2] p-1">
        {[
          { value: '', label: 'الكل' },
          { value: 'sale', label: TRANSACTION_LABELS.sale },
          { value: 'rent', label: TRANSACTION_LABELS.rent },
        ].map((item) => {
          const active = (filters.transaction_type || '') === item.value;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => handleFieldChange('transaction_type', item.value)}
              className={`cursor-pointer rounded-full py-2 text-xs font-bold transition-all ${
                active
                  ? 'bg-[#131E26] text-white shadow-xs'
                  : 'text-[#4A555E] hover:text-[#131E26]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Input
        label="البحث بالكلمة أو الكود المرجعي"
        placeholder="RES-2026 أو الكوامل أو شقة..."
        value={filters.q || ''}
        onChange={(e) => handleFieldChange('q', e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Select
          label="القطاع العقاري"
          placeholderOption="جميع القطاعات"
          value={filters.property_type || ''}
          onChange={(e) => handleFieldChange('property_type', e.target.value)}
          options={Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <Select
          label="التصنيف العقاري"
          placeholderOption="جميع التصنيفات"
          value={String(filters.category_id || '')}
          onChange={(e) => handleFieldChange('category_id', e.target.value)}
          options={categoryOptions}
        />

        <Select
          label="المدينة / المركز / الحي في سوهاج"
          placeholderOption="كل مناطق محافظة سوهاج"
          value={String(filters.location_id || '')}
          onChange={(e) => handleFieldChange('location_id', e.target.value)}
          options={locationOptions}
        />

        <Select
          label="نظام السداد"
          placeholderOption="جميع أنظمة السداد"
          value={filters.payment_method || ''}
          onChange={(e) => handleFieldChange('payment_method', e.target.value)}
          options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {/* Price Range EGP */}
      <div className="space-y-2 rounded-2xl bg-[#FAF7F2] p-3.5">
        <span className="block text-xs font-bold text-[#131E26]">
          نطاق السعر (ج.م)
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            type="number"
            min={0}
            placeholder="الحد الأدنى"
            className="bg-white"
            value={String(filters.min_price || '')}
            onChange={(e) => handleFieldChange('min_price', e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="الحد الأقصى"
            className="bg-white"
            value={String(filters.max_price || '')}
            onChange={(e) => handleFieldChange('max_price', e.target.value)}
          />
        </div>
      </div>

      {/* Area Range SQM */}
      <div className="space-y-2 rounded-2xl bg-[#FAF7F2] p-3.5">
        <span className="block text-xs font-bold text-[#131E26]">
          نطاق المساحة (م²)
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            type="number"
            min={0}
            placeholder="من (م²)"
            className="bg-white"
            value={String(filters.min_area || '')}
            onChange={(e) => handleFieldChange('min_area', e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="إلى (م²)"
            className="bg-white"
            value={String(filters.max_area || '')}
            onChange={(e) => handleFieldChange('max_area', e.target.value)}
          />
        </div>
      </div>

      {/* Bedrooms, Bathrooms & Finishing */}
      <div className="grid grid-cols-2 gap-2.5">
        <Select
          label="غرف النوم"
          placeholderOption="الكل"
          value={String(filters.bedrooms || '')}
          onChange={(e) => handleFieldChange('bedrooms', e.target.value)}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({
            value: n,
            label: `${n} غرف`,
          }))}
        />
        <Select
          label="الحمامات"
          placeholderOption="الكل"
          value={String(filters.bathrooms || '')}
          onChange={(e) => handleFieldChange('bathrooms', e.target.value)}
          options={[1, 2, 3, 4].map((n) => ({
            value: n,
            label: `${n} حمام`,
          }))}
        />
      </div>

      <Select
        label="مستوى التشطيب"
        placeholderOption="جميع مستويات التشطيب"
        value={filters.finishing_type || ''}
        onChange={(e) => handleFieldChange('finishing_type', e.target.value)}
        options={Object.entries(FINISHING_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />

      <Select
        label="ترتيب العرض"
        value={filters.sort || 'newest'}
        onChange={(e) => handleFieldChange('sort', e.target.value)}
        options={[
          { value: 'newest', label: 'الأحدث والمميز أولاً' },
          { value: 'price_asc', label: 'السعر: من الأقل إلى الأعلى' },
          { value: 'price_desc', label: 'السعر: من الأعلى إلى الأقل' },
          { value: 'area_desc', label: 'المساحة: الأكبر أولاً' },
        ]}
      />

      <div className="pt-2">
        <Button type="submit" variant="gold" size="lg" fullWidth>
          عرض العقارات المطابقة
        </Button>
      </div>
    </form>
  );
}
