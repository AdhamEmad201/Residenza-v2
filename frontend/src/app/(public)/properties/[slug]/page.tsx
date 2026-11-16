import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import {
  FACADE_TYPE_LABELS,
  FINISHING_TYPE_LABELS,
  getPublicPropertyBySlug,
  LEGAL_STATUS_LABELS,
  TRANSACTION_LABELS,
} from '@/lib/api/public';
import { formatAreaSqm, formatDateAr, formatPriceEgp } from '@/lib/utils/format';
import { PropertyGallery } from '@/components/marketplace/PropertyGallery';
import { PricingBreakdown } from '@/components/marketplace/PricingBreakdown';
import { ContactCtaCard } from '@/components/marketplace/ContactCtaCard';

export const dynamic = 'force-dynamic';

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    return {
      title: 'العقار غير موجود',
    };
  }

  const priceText = formatPriceEgp(property.price_egp);
  const locationText = property.location?.name_ar || 'سوهاج';

  return {
    title: `${property.title_ar} (${property.reference_code}) - ${locationText}`,
    description: `${property.title_ar} في ${locationText} بسعر ${priceText}. المساحة ${formatAreaSqm(
      property.area_sqm
    )}. إعلان معتمد للنشر على منصة ريزيدنزا سوهاج.`,
    openGraph: {
      title: `${property.title_ar} | ريزيدنزا سوهاج`,
      description: `${TRANSACTION_LABELS[property.transaction_type]} في ${locationText} — ${priceText} — كود المرجع ${property.reference_code}`,
      type: 'article',
      locale: 'ar_EG',
    },
  };
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const utilities = [
    { label: 'مصعد كهربائي (أسانسير)', active: property.has_elevator },
    { label: 'عداد كهرباء مستقل', active: property.has_electricity_meter },
    { label: 'عداد مياه', active: property.has_water_meter },
    { label: 'غاز طبيعي', active: property.has_natural_gas },
  ];

  return (
    <div className="py-10 lg:py-16">
      <Container>
        {/* Soft Pill Breadcrumb Navigation */}
        <nav
          aria-label="مسار التنقل"
          className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full bg-[#F3EDE2] px-5 py-2 text-xs font-semibold text-[#4A555E]"
        >
          <Link href="/" className="hover:text-[#131E26]">
            الرئيسية
          </Link>
          <span>/</span>
          <Link href="/properties" className="hover:text-[#131E26]">
            عقارات سوهاج
          </Link>
          {property.category && (
            <>
              <span>/</span>
              <Link
                href={`/properties?category_id=${property.category.id}`}
                className="hover:text-[#131E26]"
              >
                {property.category.name_ar}
              </Link>
            </>
          )}
          {property.location && (
            <>
              <span>/</span>
              <Link
                href={`/properties?location_id=${property.location.id}`}
                className="hover:text-[#131E26]"
              >
                {property.location.name_ar}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-mono font-bold text-[#A67C33] tabular-nums-west">
            {property.reference_code}
          </span>
        </nav>

        {/* Warm Luxury Title Header */}
        <header className="mb-8 rounded-3xl bg-white p-7 shadow-ambient sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F6EF] px-4 py-1.5 font-bold text-[#136F48]">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
                معتمد للنشر — تمت مراجعة البيانات
              </span>
              <span className="rounded-full bg-[#131E26] px-4 py-1.5 font-bold text-white">
                {TRANSACTION_LABELS[property.transaction_type]}
              </span>
              {property.is_featured && (
                <span className="rounded-full bg-[#F7EFE0] px-4 py-1.5 font-bold text-[#8E6722]">
                  وحدة مميزة
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[#78828A] tabular-nums-west">
              <span className="rounded-full bg-[#FAF7F2] px-3.5 py-1.5">
                الكود المرجعي:{' '}
                <strong className="font-mono text-[#131E26]">
                  {property.reference_code}
                </strong>
              </span>
              {property.published_at && (
                <span className="hidden sm:inline">
                  تاريخ الاعتماد: {formatDateAr(property.published_at)}
                </span>
              )}
            </div>
          </div>

          <h1 className="mt-5 text-2xl font-extrabold leading-snug tracking-tight text-[#131E26] sm:text-4xl">
            {property.title_ar}
          </h1>

          <p className="mt-3 text-sm font-medium text-[#4A555E]">
            <strong className="text-[#A67C33]">
              {property.location?.name_ar || 'محافظة سوهاج'}
            </strong>{' '}
            — {property.address_details_ar}
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Primary Column (8 cols) */}
          <div className="space-y-8 lg:col-span-8">
            {/* Interactive Rounded-3xl Image Gallery */}
            <PropertyGallery
              images={property.images}
              title={property.title_ar}
              referenceCode={property.reference_code}
            />

            {/* Financial Breakdown Panel (UD-02 = B & OD-05 = A) */}
            <PricingBreakdown property={property} />

            {/* Specifications Soft Pill Grid */}
            <section className="rounded-3xl bg-white p-7 shadow-ambient">
              <span className="text-xs font-bold text-[#C59B4E]">
                البيانات الهندسية والمعمارية
              </span>
              <h2 className="mt-1 text-xl font-bold text-[#131E26]">
                المواصفات الفنية للوحدة
              </h2>

              <dl className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 text-sm tabular-nums-west">
                <div className="rounded-2xl bg-[#FAF7F2] p-4">
                  <dt className="text-xs text-[#78828A]">المساحة الإجمالية</dt>
                  <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                    {formatAreaSqm(property.area_sqm)}
                  </dd>
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] p-4">
                  <dt className="text-xs text-[#78828A]">التصنيف العقاري</dt>
                  <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                    {property.category?.name_ar || 'غير محدد'}
                  </dd>
                </div>

                {property.bedrooms !== null && property.bedrooms !== undefined && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">عدد غرف النوم</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {property.bedrooms} غرف
                    </dd>
                  </div>
                )}

                {property.bathrooms !== null && property.bathrooms !== undefined && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">عدد الحمامات</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {property.bathrooms} حمام
                    </dd>
                  </div>
                )}

                {property.floor_level !== null && property.floor_level !== undefined && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">الطابق (الدور)</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {property.floor_level === 0
                        ? 'الدور الأرضي'
                        : `الدور ${property.floor_level}`}
                      {property.total_floors ? ` من ${property.total_floors}` : ''}
                    </dd>
                  </div>
                )}

                {property.finishing_type && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">مستوى التشطيب</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {FINISHING_TYPE_LABELS[property.finishing_type]}
                    </dd>
                  </div>
                )}

                {property.facade_type && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">الواجهة والاتجاه</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {FACADE_TYPE_LABELS[property.facade_type]}
                    </dd>
                  </div>
                )}

                {property.street_width_meters && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">عرض الشارع</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {parseFloat(property.street_width_meters)} متر
                    </dd>
                  </div>
                )}

                {property.building_year && (
                  <div className="rounded-2xl bg-[#FAF7F2] p-4">
                    <dt className="text-xs text-[#78828A]">سنة البناء</dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {property.building_year}
                    </dd>
                  </div>
                )}

                {property.declared_legal_status && (
                  <div className="rounded-2xl bg-[#F7EFE0]/70 p-4">
                    <dt className="text-xs font-bold text-[#8E6722]">
                      الموقف القانوني المصرّح به
                    </dt>
                    <dd className="mt-1 text-base font-extrabold text-[#131E26]">
                      {LEGAL_STATUS_LABELS[property.declared_legal_status]}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Utilities & Infrastructure Pills */}
            <section className="rounded-3xl bg-white p-7 shadow-ambient">
              <span className="text-xs font-bold text-[#C59B4E]">
                البنية التحتية والخدمات
              </span>
              <h2 className="mt-1 text-xl font-bold text-[#131E26]">
                المرافق والعدادات المتوفرة
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                {utilities.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl p-4 ${
                      item.active ? 'bg-[#E8F6EF]/70' : 'bg-[#FAF7F2]'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-[#4A555E]">
                      {item.label}
                    </span>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                        item.active
                          ? 'bg-[#136F48] text-white'
                          : 'bg-[#F3EDE2] text-[#78828A]'
                      }`}
                    >
                      {item.active ? 'متوفر ✓' : 'غير متوفر'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Narrative Description Card */}
            <section className="rounded-3xl bg-white p-7 shadow-ambient">
              <span className="text-xs font-bold text-[#C59B4E]">
                تفاصيل العرض
              </span>
              <h2 className="mt-1 text-xl font-bold text-[#131E26]">
                الوصف التفصيلي للعقار
              </h2>
              <div className="mt-4 whitespace-pre-line text-base leading-loose text-[#131E26]/90">
                {property.description_ar}
              </div>
            </section>
          </div>

          {/* Sticky Publisher & Contact CTA Column (4 cols) */}
          <div className="lg:col-span-4">
            <ContactCtaCard property={property} />
          </div>
        </div>
      </Container>
    </div>
  );
}
