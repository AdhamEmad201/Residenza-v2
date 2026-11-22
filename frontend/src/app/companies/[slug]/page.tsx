'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PropertyCard } from '@/components/marketplace/PropertyCard';
import { BACKEND_URL } from '@/lib/api/client';
import {
  getPublicCompanyStorefront,
  PROPERTY_TYPE_LABELS,
  trackPublicClick,
  TRANSACTION_LABELS,
} from '@/lib/api/public';
import type { AvailabilityStatus, PropertyType, TransactionType } from '@/types/api';
import type { CompanyProject, CompanyStorefrontResponse } from '@/types/company';

type StorefrontTab = 'properties' | 'projects' | 'about';

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'متاح للحجز والمعاينة',
  sold: 'تم البيع',
  rented: 'تم التأجير',
  hidden: 'غير معروض حالياً',
};

function resolveMediaUrl(url?: string | null, filePath?: string | null): string | null {
  if (filePath) {
    return `${BACKEND_URL}/storage/${filePath.replace(/^\/+/, '')}`;
  }
  if (url) {
    return url.startsWith('http')
      ? url
      : `${BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return null;
}

function formatWhatsappHref(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('0') ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function formatTelHref(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

function sanitizeHexColor(raw?: string | null): string {
  return raw && /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : '#9F7753';
}

export default function CompanyStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  const [storefront, setStorefront] = useState<CompanyStorefrontResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  const [activeTab, setActiveTab] = useState<StorefrontTab>('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType | ''>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityStatus | ''>('');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | ''>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadStorefront() {
      if (!slug) return;
      setIsLoading(true);
      const data = await getPublicCompanyStorefront(slug, { per_page: 50 });
      if (!active) return;
      if (!data) {
        setNotFoundError(true);
      } else {
        setStorefront(data);
        setNotFoundError(false);
        trackPublicClick({
          type: 'view',
          target_type: 'company',
          id: data.company.id,
        });
      }
      setIsLoading(false);
    }
    loadStorefront();
    return () => {
      active = false;
    };
  }, [slug]);

  const company = storefront?.company ?? null;
  const allProperties = useMemo(() => storefront?.properties ?? [], [storefront]);
  const projects = useMemo(() => company?.projects ?? [], [company]);

  // Distinct neighborhood options derived strictly from this company's properties
  const availableLocations = useMemo(() => {
    const map = new Map<number, string>();
    for (const prop of allProperties) {
      if (prop.location?.id && prop.location?.name_ar) {
        map.set(prop.location.id, prop.location.name_ar);
      }
    }
    return Array.from(map.entries()).map(([id, name_ar]) => ({ id, name_ar }));
  }, [allProperties]);

  // Scoped client-side live filtering strictly within this company's properties
  const filteredProperties = useMemo(() => {
    return allProperties.filter((prop) => {
      if (selectedProjectId !== null && prop.project?.id !== selectedProjectId) {
        return false;
      }
      if (
        selectedPropertyType &&
        prop.category?.property_type &&
        prop.category.property_type !== selectedPropertyType
      ) {
        return false;
      }
      if (selectedLocationId && String(prop.location?.id ?? '') !== selectedLocationId) {
        return false;
      }
      if (selectedAvailability && prop.availability_status !== selectedAvailability) {
        return false;
      }
      if (selectedTransaction && prop.transaction_type !== selectedTransaction) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchesTitle = prop.title_ar.toLowerCase().includes(q);
        const matchesAddress = prop.address_details_ar.toLowerCase().includes(q);
        const matchesRef = prop.reference_code.toLowerCase().includes(q);
        const matchesLocation = (prop.location?.name_ar ?? '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesAddress && !matchesRef && !matchesLocation) {
          return false;
        }
      }
      return true;
    });
  }, [
    allProperties,
    selectedProjectId,
    selectedPropertyType,
    selectedLocationId,
    selectedAvailability,
    selectedTransaction,
    searchQuery,
  ]);

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      window.setTimeout(() => setCopiedToast(false), 3000);
    } catch {
      setCopiedToast(true);
      window.setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedPropertyType('');
    setSelectedLocationId('');
    setSelectedAvailability('');
    setSelectedTransaction('');
    setSelectedProjectId(null);
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <Container>
          <div className="mx-auto max-w-lg rounded-3xl bg-white p-12 text-center shadow-ambient">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-[#9F7753] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-[#403E3D]">
              جارٍ تحميل المتجر العقاري الرسمي للشركة...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (notFoundError || !company) {
    return (
      <div className="py-16">
        <Container>
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-ambient">
            <span className="inline-block rounded-full bg-[#F3EAD8] px-4 py-1 text-xs font-bold text-[#8A6346]">
              واجهة شركة غير موجودة
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-[#403E3D]">
              تعذر العثور على المتجر العقاري المطلوب
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5C5855]">
              تأكد من صحة الرابط أو تصفح جميع الوحدات العقارية المعتمدة على منصة ريزيدنزا سوهاج.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/properties"
                className="rounded-full bg-[#9F7753] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#8A6346]"
              >
                العودة لكل عقارات المنصة
              </Link>
              <Link
                href="/"
                className="rounded-full bg-[#F3EAD8] px-6 py-3 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/40"
              >
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const logoUrl = resolveMediaUrl(company.logo_url, company.logo_path);
  const coverUrl = resolveMediaUrl(company.cover_url, company.cover_path);
  const whatsappHref = formatWhatsappHref(company.whatsapp || company.phone);
  const telHref = formatTelHref(company.phone);
  const accentColor = sanitizeHexColor(company.accent_color);

  return (
    <div className="pb-16">
      {/* 1. Slim Top Platform Bar */}
      <div className="border-b border-[#403E3D]/10 bg-[#F3EAD8]/75 py-2.5">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-xs font-bold text-[#403E3D] transition hover:text-[#9F7753]"
            >
              <Image
                src="/images/residenza-logo.svg"
                alt="RESIDENZA"
                width={118}
                height={28}
                className="h-6 w-auto"
              />
              <span className="hidden text-[11px] text-[#5C5855] sm:inline">
                · البوابة الرسمية للشركاء العقاريين
              </span>
            </Link>

            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#403E3D] shadow-xs transition hover:bg-[#403E3D] hover:text-white"
            >
              <span>العودة لكل عقارات المنصة</span>
              <span aria-hidden="true">&#8592;</span>
            </Link>
          </div>
        </Container>
      </div>

      {/* 2. Branded Agency Header */}
      <Container className="mt-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-ambient-lg">
          {/* Full-width Cover Banner */}
          <div
            className="relative h-52 w-full overflow-hidden sm:h-64 lg:h-72"
            style={{
              background: `linear-gradient(135deg, #403E3D 0%, #2F2D2C 52%, ${accentColor} 100%)`,
            }}
          >
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={`غلاف ${company.name}`}
                className="h-full w-full object-cover opacity-85"
              />
            )}
            <div className="bg-destination-scrim pointer-events-none absolute inset-0" />

            {/* Top Floating Storefront Pill */}
            <div className="absolute inset-x-6 top-5 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#403E3D]/85 px-4 py-1.5 text-[11px] font-bold text-[#FAF7F2] backdrop-blur-md">
                المتجر العقاري الرسمي · RESIDENZA STOREFRONT
              </span>

              {company.is_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F6EF] px-4 py-1.5 text-xs font-extrabold text-[#136F48] shadow-sm">
                  <span>✔</span>
                  <span>شريك معتمد</span>
                </span>
              )}
            </div>
          </div>

          {/* Overlapping Agency Identity & Direct Action Bar */}
          <div className="relative px-6 pt-4 pb-7 sm:px-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end">
                {/* Overlapping Company Logo */}
                <div className="-mt-16 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[#FAF7F2] shadow-ambient-lg sm:-mt-20 sm:h-32 sm:w-32">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={company.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-[#9F7753]">
                      {company.name.slice(0, 1)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-extrabold text-[#403E3D] sm:text-3xl">
                      {company.name}
                    </h1>
                    {company.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F6EF] px-3 py-1 text-xs font-bold text-[#136F48]">
                        <span>✔</span>
                        <span>شريك معتمد</span>
                      </span>
                    )}
                  </div>

                  {company.address && (
                    <p className="text-xs font-bold text-[#9F7753]">
                      📍 {company.address}
                    </p>
                  )}

                  {company.bio && (
                    <p className="max-w-2xl line-clamp-2 text-xs leading-relaxed text-[#5C5855]">
                      {company.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Direct Contact & Share CTA Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackPublicClick({
                        type: 'whatsapp',
                        target_type: 'company',
                        id: company.id,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-[#136F48] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#0F5939]"
                  >
                    <span>تواصل واتساب مباشر</span>
                  </a>
                )}

                {telHref && company.phone && (
                  <a
                    href={telHref}
                    onClick={() =>
                      trackPublicClick({
                        type: 'phone',
                        target_type: 'company',
                        id: company.id,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-[#403E3D] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#2F2D2C]"
                  >
                    <span>اتصال هاتفي</span>
                    <span className="tabular-nums-west" dir="ltr">
                      {company.phone}
                    </span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="cursor-pointer rounded-full bg-[#F3EAD8] px-5 py-3 text-xs font-bold text-[#403E3D] transition hover:bg-[#CEB38F]/50"
                >
                  {copiedToast ? 'تم نسخ الرابط بنجاح ✓' : 'مشاركة الصفحة'}
                </button>
              </div>
            </div>

            {/* 3. Scoped Storefront Navigation Tabs */}
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[#403E3D]/10 pt-5">
              <button
                type="button"
                onClick={() => setActiveTab('properties')}
                className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition ${
                  activeTab === 'properties'
                    ? 'bg-[#403E3D] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5C5855] hover:bg-[#F3EAD8] hover:text-[#403E3D]'
                }`}
              >
                <span>كل العقارات</span>
                <span className="ms-2 rounded-full bg-[#9F7753] px-2 py-0.5 text-[11px] text-white tabular-nums-west">
                  {allProperties.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition ${
                  activeTab === 'projects'
                    ? 'bg-[#403E3D] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5C5855] hover:bg-[#F3EAD8] hover:text-[#403E3D]'
                }`}
              >
                <span>المشاريع والكمبوندات</span>
                <span className="ms-2 rounded-full bg-[#F3EAD8] px-2 py-0.5 text-[11px] text-[#8A6346] tabular-nums-west">
                  {projects.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition ${
                  activeTab === 'about'
                    ? 'bg-[#403E3D] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5C5855] hover:bg-[#F3EAD8] hover:text-[#403E3D]'
                }`}
              >
                عن الشركة
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: All Properties + Scoped Live Filters */}
        {activeTab === 'properties' && (
          <div className="mt-8 space-y-6">
            {/* Scoped Filter Bar */}
            <div className="rounded-3xl bg-white p-5 shadow-ambient sm:p-6">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-bold text-[#5C5855]">
                    بحث داخل عقارات {company.name}
                  </label>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالعنوان أو الكود المرجعي أو المنطقة..."
                    className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#403E3D] placeholder:text-[#7D7772] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#5C5855]">
                    نوع العقار
                  </label>
                  <select
                    value={selectedPropertyType}
                    onChange={(e) =>
                      setSelectedPropertyType(e.target.value as PropertyType | '')
                    }
                    className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                  >
                    <option value="">كل الأنواع</option>
                    {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => (
                      <option key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#5C5855]">
                    المنطقة / الحي
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                  >
                    <option value="">كل المناطق</option>
                    {availableLocations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#5C5855]">
                    حالة التوفر والمعاملة
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTransaction}
                      onChange={(e) =>
                        setSelectedTransaction(e.target.value as TransactionType | '')
                      }
                      className="w-1/2 rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-2.5 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    >
                      <option value="">بيع وإيجار</option>
                      <option value="sale">{TRANSACTION_LABELS.sale}</option>
                      <option value="rent">{TRANSACTION_LABELS.rent}</option>
                    </select>

                    <select
                      value={selectedAvailability}
                      onChange={(e) =>
                        setSelectedAvailability(e.target.value as AvailabilityStatus | '')
                      }
                      className="w-1/2 rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-2.5 py-2.5 text-xs font-semibold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    >
                      <option value="">كل الحالات</option>
                      <option value="available">{AVAILABILITY_LABELS.available}</option>
                      <option value="sold">{AVAILABILITY_LABELS.sold}</option>
                      <option value="rented">{AVAILABILITY_LABELS.rented}</option>
                    </select>
                  </div>
                </div>
              </div>

              {(searchQuery ||
                selectedPropertyType ||
                selectedLocationId ||
                selectedAvailability ||
                selectedTransaction ||
                selectedProjectId !== null) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#403E3D]/10 pt-3 text-xs">
                  <span className="font-bold text-[#5C5855]">
                    عدد النتائج المطابقة:{' '}
                    <strong className="text-[#9F7753] tabular-nums-west">
                      {filteredProperties.length}
                    </strong>{' '}
                    وحدة عقارية
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="cursor-pointer font-bold text-[#8A6346] underline-offset-4 hover:underline"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}
            </div>

            {/* Scoped Properties Grid */}
            {filteredProperties.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-ambient">
                <p className="text-base font-extrabold text-[#403E3D]">
                  لا توجد عقارات مطابقة لمعايير البحث داخل هذه الشركة حالياً
                </p>
                <p className="mt-1.5 text-xs text-[#5C5855]">
                  جرب تغيير الفلاتر أو استعرض جميع وحدات الشركة المعتمدة.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 cursor-pointer rounded-full bg-[#9F7753] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#8A6346]"
                >
                  عرض كل عقارات الشركة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Company Projects & Compounds */}
        {activeTab === 'projects' && (
          <div className="mt-8">
            {projects.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-ambient">
                <p className="text-base font-extrabold text-[#403E3D]">
                  لم تقم الشركة بإدراج مشاريع أو كمبوندات مجمعة بعد
                </p>
                <p className="mt-1.5 text-xs text-[#5C5855]">
                  يمكنك استعراض جميع وحدات الشركة الفردية في تبويب «كل العقارات».
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project: CompanyProject) => {
                  const projectCover = resolveMediaUrl(
                    project.cover_url,
                    project.cover_path
                  );
                  const projectPropertiesCount = allProperties.filter(
                    (p) => p.project?.id === project.id
                  ).length;

                  return (
                    <div
                      key={project.id}
                      className="flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-4 shadow-ambient"
                    >
                      <div>
                        <div className="bg-nile-luxury relative aspect-16/10 w-full overflow-hidden rounded-2xl">
                          {projectCover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={projectCover}
                              alt={project.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                          <div className="bg-card-scrim pointer-events-none absolute inset-0" />
                          <span className="absolute start-3 bottom-3 rounded-full bg-[#403E3D]/85 px-3 py-1 text-[11px] font-bold text-[#FAF7F2]">
                            📍 {project.location}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-extrabold text-[#403E3D]">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#5C5855]">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#403E3D]/10 pt-3.5">
                        <span className="text-xs font-bold text-[#8A6346] tabular-nums-west">
                          {projectPropertiesCount} وحدة متاحة
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(project.id);
                            setActiveTab('properties');
                          }}
                          className="cursor-pointer rounded-full bg-[#F3EAD8] px-4 py-2 text-xs font-bold text-[#403E3D] transition hover:bg-[#9F7753] hover:text-white"
                        >
                          استعراض وحدات المشروع &#8592;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: About the Company */}
        {activeTab === 'about' && (
          <div className="mt-8 rounded-3xl bg-white p-8 shadow-ambient sm:p-10">
            <span className="inline-block rounded-full bg-[#F3EAD8] px-4 py-1 text-xs font-bold text-[#8A6346]">
              نبذة تعريفية عن الشريك العقاري
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-[#403E3D]">
              {company.name}
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-loose text-[#5C5855]">
              {company.bio ||
                'شركة عقارية مسجلة على منصة ريزيدنزا سوهاج لطرح الوحدات السكنية والتجارية والإدارية بشفافية مالية كاملة.'}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl bg-[#FAF7F2] p-6 sm:grid-cols-3">
              <div>
                <span className="block text-[11px] font-bold text-[#7D7772]">
                  المقر والعنوان
                </span>
                <span className="mt-1 block text-xs font-extrabold text-[#403E3D]">
                  {company.address || 'محافظة سوهاج'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#7D7772]">
                  هاتف التواصل المباشر
                </span>
                <span
                  className="mt-1 block text-xs font-extrabold text-[#403E3D] tabular-nums-west"
                  dir="ltr"
                >
                  {company.phone || 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#7D7772]">
                  حالة الاعتماد على ريزيدنزا
                </span>
                <span className="mt-1 block text-xs font-extrabold text-[#136F48]">
                  {company.is_verified
                    ? '✔ شريك عقاري معتمد'
                    : 'حساب شركة مسجل'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Storefront Footer with Powered by RESIDENZA Attribution */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl bg-[#403E3D] px-7 py-6 text-xs text-[#FAF7F2] sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-bold text-white">{company.name}</p>
            <p className="text-[#CEB38F]">
              {company.address || 'محافظة سوهاج ومدينة سوهاج الجديدة'}
              {company.phone ? ` · هاتف: ${company.phone}` : ''}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-bold text-[#F3EAD8] transition hover:bg-white/20"
          >
            <span>Powered by RESIDENZA</span>
            <span className="text-[#CEB38F]">· ريزيدنزا سوهاج</span>
          </Link>
        </div>
      </Container>
    </div>
  );
}
