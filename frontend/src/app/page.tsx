import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import {
  getPublicCategories,
  getPublicLocations,
  getPublicProperties,
  PROPERTY_TYPE_LABELS,
} from '@/lib/api/public';
import { PropertyCard } from '@/components/marketplace/PropertyCard';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const DESTINATION_IMAGES = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600573472589-003525b2b729?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
];

export default async function HomePage() {
  const [propertiesResult, categories, locationRoots] = await Promise.all([
    getPublicProperties({ per_page: 6, sort: 'newest' }),
    getPublicCategories(),
    getPublicLocations(),
  ]);

  const sohagRoot = locationRoots[0];
  const primaryLocations = sohagRoot?.children?.slice(0, 8) || locationRoots.slice(0, 8);

  return (
    <div className="space-y-24 pb-12">
      {/* Full-Bleed Living Luxury Hero Stage + Floating Glassmorphic Search Capsule */}
      <section className="pt-4 sm:pt-6">
        <Container>
          <div className="bg-nile-luxury relative overflow-hidden rounded-3xl shadow-ambient-lg">
            {/* Ken Burns Cinematic Architectural Photograph */}
            <div className="absolute inset-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                alt="إطلالة معمارية فاخرة — ريزيدنزا سوهاج"
                decoding="async"
                fetchPriority="high"
                className="animate-kenburns h-full w-full object-cover opacity-65"
              />
              <div className="bg-hero-vignette absolute inset-0" />
            </div>

            {/* Hero Foreground Typography & Atmosphere */}
            <div className="relative z-10 px-6 pt-14 pb-28 sm:px-12 sm:pt-20 sm:pb-32 lg:px-16 lg:pt-24">
              <div className="max-w-3xl">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[#131E26]/88 px-4 py-1.5 text-xs font-bold text-[#F7EFE0]">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                  <span>معتمد للنشر — تمت مراجعة البيانات</span>
                  <span className="text-white/40">•</span>
                  <span className="text-[#E5C378]">سوهاج وسوهاج الجديدة</span>
                </div>

                <h1 className="mt-6 text-3xl font-extrabold leading-[1.2] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  حيث تلتقي فخامة المعمار بصفاء الاستثمار في{' '}
                  <span className="text-[#E5C378]">سوهاج</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-lg">
                  اكتشف نخبة الوحدات السكنية، الفيلات، المقرات الإدارية، والأراضي المعتمدة في مدينة سوهاج ومدينة سوهاج الجديدة بشفافية مالية كاملة تفصل بين سعر الكاش وخطة التقسيط.
                </p>

                {/* Floating Stat Pills */}
                <dl className="mt-8 flex flex-wrap items-center gap-3 tabular-nums-west">
                  <div className="rounded-2xl bg-[#131E26]/88 px-4 py-2.5">
                    <dt className="text-[11px] text-white/75">عقارات معتمدة</dt>
                    <dd className="text-xl font-extrabold text-white">
                      {propertiesResult.meta.total}+
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-[#131E26]/88 px-4 py-2.5">
                    <dt className="text-[11px] text-white/75">وجهة في سوهاج</dt>
                    <dd className="text-xl font-extrabold text-[#E5C378]">38</dd>
                  </div>
                  <div className="rounded-2xl bg-[#131E26]/88 px-4 py-2.5">
                    <dt className="text-[11px] text-white/75">نظام التسعير</dt>
                    <dd className="text-sm font-bold text-white">كاش وتقسيط منفصل</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Floating Glassmorphic Search Capsule */}
          <div className="relative z-20 mx-auto -mt-16 max-w-5xl px-2 sm:px-6">
            <div className="rounded-3xl bg-white/95 p-5 shadow-capsule backdrop-blur-md sm:p-7">
              {/* Quick-Filter Category Pills */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#78828A] me-1">
                    تصفح سريع:
                  </span>
                  <Link
                    href="/properties?property_type=residential"
                    className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition-all hover:bg-[#131E26] hover:text-white"
                  >
                    شقق وفيلات سكنية
                  </Link>
                  <Link
                    href="/properties?property_type=commercial"
                    className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition-all hover:bg-[#131E26] hover:text-white"
                  >
                    محلات ومقرات تجارية
                  </Link>
                  <Link
                    href="/properties?property_type=administrative"
                    className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition-all hover:bg-[#131E26] hover:text-white"
                  >
                    مكاتب وعيادات إدارية
                  </Link>
                  <Link
                    href="/properties?property_type=land"
                    className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition-all hover:bg-[#131E26] hover:text-white"
                  >
                    أراضي استثمارية
                  </Link>
                </div>

                <Link
                  href="/properties?payment_method=cash_or_installment"
                  className="rounded-full bg-[#F7EFE0] px-3.5 py-1.5 text-xs font-bold text-[#8E6722] transition hover:bg-[#C59B4E] hover:text-white"
                >
                  متاح تقسيط مرن
                </Link>
              </div>

              {/* Search Capsule Form */}
              <form
                action="/properties"
                method="GET"
                aria-label="البحث السريع في سجل العقارات"
                className="grid grid-cols-1 gap-3 md:grid-cols-12"
              >
                <div className=" rounded-2xl bg-[#FAF7F2] px-4 py-2.5 md:col-span-4">
                  <label
                    htmlFor="hero-q"
                    className="block text-[11px] font-bold text-[#78828A]"
                  >
                    الموقع أو الكود المرجعي
                  </label>
                  <input
                    id="hero-q"
                    name="q"
                    type="text"
                    placeholder="سوهاج الجديدة، الكوثر، RES-2026..."
                    className="mt-0.5 w-full bg-transparent text-sm font-bold text-[#131E26] placeholder:font-normal placeholder:text-[#78828A] focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 md:col-span-3">
                  <label
                    htmlFor="hero-tx"
                    className="block text-[11px] font-bold text-[#78828A]"
                  >
                    نوع العرض
                  </label>
                  <select
                    id="hero-tx"
                    name="transaction_type"
                    defaultValue=""
                    className="mt-0.5 w-full bg-transparent text-sm font-bold text-[#131E26] focus:outline-none"
                  >
                    <option value="">للبيع والإيجار</option>
                    <option value="sale">للبيع (تملك)</option>
                    <option value="rent">للإيجار</option>
                  </select>
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] px-4 py-2.5 md:col-span-3">
                  <label
                    htmlFor="hero-cat"
                    className="block text-[11px] font-bold text-[#78828A]"
                  >
                    التصنيف العقاري
                  </label>
                  <select
                    id="hero-cat"
                    name="category_id"
                    defaultValue=""
                    className="mt-0.5 w-full bg-transparent text-sm font-bold text-[#131E26] focus:outline-none"
                  >
                    <option value="">كل التصنيفات</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-stretch md:col-span-2">
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-full bg-[#C59B4E] px-6 py-4 text-xs font-extrabold tracking-wide text-white shadow-md transition-all duration-300 hover:bg-[#A67C33] hover:shadow-lg active:scale-[0.98]"
                  >
                    ابحث الآن
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Container>
      </section>

      {/* Curated Living Luxury Properties Showcase */}
      <section className="section-contain">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-block rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#A67C33]">
                مختارات ريزيدنزا المعتمدة
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-4xl">
                أحدث العقارات المعتمدة في سوهاج
              </h2>
            </div>

            <Link
              href="/properties"
              className="rounded-full bg-[#131E26] px-6 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1E2E3A] active:scale-[0.98]"
            >
              تصفح جميع العقارات ({propertiesResult.meta.total}) &#8592;
            </Link>
          </div>

          <div className="mt-10">
            {propertiesResult.items.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {propertiesResult.items.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد وحدات منشورة في السجل حالياً"
                description="تخضع الدفعة الحالية من عقارات محافظة سوهاج لمراجعة البيانات والاعتماد. يمكنك إدراج وحدتك الآن."
                actionLabel="أضف عقارك للمراجعة"
                actionHref="/register"
              />
            )}
          </div>
        </Container>
      </section>

      {/* Living Sohag Destination Photo Cards (Rounded-3xl) */}
      <section className="section-contain">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-block rounded-full bg-[#F3EDE2] px-3.5 py-1 text-xs font-bold text-[#A67C33]">
                وجهات السكن والاستثمار
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-4xl">
                استكشف أبرز مدن وأحياء محافظة سوهاج
              </h2>
            </div>
            <Link
              href="/locations"
              className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#131E26] shadow-ambient transition hover:bg-[#131E26] hover:text-white"
            >
              الدليل الجغرافي الكامل (38 منطقة) &#8592;
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {primaryLocations.map((loc, idx) => {
              const photoUrl =
                DESTINATION_IMAGES[idx % DESTINATION_IMAGES.length];
              return (
                <Link
                  key={loc.id}
                  href={`/properties?location_id=${loc.id}`}
                  className="bg-nile-luxury property-card group relative flex aspect-4/5 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-ambient transition-transform duration-300 ease-out hover:-translate-y-1.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={loc.name_ar}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="bg-destination-scrim absolute inset-0" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="rounded-full bg-[#131E26]/88 px-3 py-1 text-[11px] font-bold text-white tabular-nums-west">
                      {loc.children && loc.children.length > 0
                        ? `${loc.children.length} أحياء ومناطق`
                        : 'وجهة معتمدة'}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-bold text-[#131E26] transition-transform duration-300 group-hover:scale-110">
                      &#8592;
                    </span>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[11px] font-bold text-[#E5C378]">
                      محافظة سوهاج
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold text-white">
                      {loc.name_ar}
                    </h3>
                    <p className="mt-1.5 text-xs text-white/80">
                      تصفح العقارات المعتمدة في {loc.name_ar}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Warm Sand Surface: Sculptural Architectural Categories */}
      <section className="section-contain bg-[#F3EDE2] py-20">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#A67C33] shadow-2xs">
                التصنيفات العقارية
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-4xl">
                اختر نوع العقار المناسب لاحتياجك
              </h2>
            </div>
            <Link
              href="/categories"
              className="rounded-full bg-[#131E26] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1E2E3A]"
            >
              عرض جميع التصنيفات &#8592;
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="property-card flex flex-col justify-between rounded-3xl border border-[#131E26]/5 bg-white p-7 shadow-ambient transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-[#C59B4E]/35"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#8E6722]">
                      {PROPERTY_TYPE_LABELS[category.property_type]}
                    </span>
                    <Link
                      href={`/properties?category_id=${category.id}`}
                      className="text-xs font-bold text-[#A67C33] hover:underline"
                    >
                      استعراض الكل &#8592;
                    </Link>
                  </div>

                  <h3 className="mt-4 text-2xl font-extrabold text-[#131E26]">
                    <Link
                      href={`/properties?category_id=${category.id}`}
                      className="transition hover:text-[#A67C33]"
                    >
                      {category.name_ar}
                    </Link>
                  </h3>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {category.children && category.children.length > 0 ? (
                    category.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/properties?category_id=${sub.id}`}
                        className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#131E26] transition-all hover:bg-[#131E26] hover:text-white"
                      >
                        {sub.name_ar}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-[#78828A]">
                      وحدات سكنية واستثمارية معتمدة في سوهاج
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Editorial Story Strip: 3 Living Luxury Pillars */}
      <section className="section-contain">
        <Container>
          <div className="bg-nile-luxury rounded-3xl p-8 text-white shadow-ambient-lg sm:p-12 lg:p-16">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-[#C59B4E]/20 px-4 py-1 text-xs font-bold text-[#E5C378]">
                لماذا ريزيدنزا سوهاج؟
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                تجربة عقارية راقية مبنية على الثقة والوضوح المالي
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white/[0.08] p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C59B4E] text-sm font-extrabold text-white">
                  01
                </span>
                <h3 className="mt-5 text-xl font-bold text-white">
                  معتمد للنشر — تمت مراجعة البيانات
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/80">
                  يخضع كل إعلان جديد أو تعديل جوهري لمراجعة دقيقة من فريق المنصة للتأكد من اكتمال البيانات والصور قبل ظهوره للجمهور.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.08] p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C59B4E] text-sm font-extrabold text-white">
                  02
                </span>
                <h3 className="mt-5 text-xl font-bold text-white">
                  شفافية الكاش والتقسيط
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/80">
                  فصل واضح وصريح بين سعر الكاش الفوري وإجمالي سعر التقسيط مع بيان قيمة المقدم (أو بدون مقدم 0 ج.م) ومدة السداد بالأشهر.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.08] p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C59B4E] text-sm font-extrabold text-white">
                  03
                </span>
                <h3 className="mt-5 text-xl font-bold text-white">
                  تواصل مباشر بدون عمولات خفية
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/80">
                  تعرّف على صفة المعلن بوضوح (مالك عقار، وسيط معتمد، أو شركة تطوير) وتواصل معه مباشرة عبر الهاتف أو واتساب بكود مرجعي موحد.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
