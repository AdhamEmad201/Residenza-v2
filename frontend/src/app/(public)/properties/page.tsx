import React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import {
  getPublicCategories,
  getPublicLocations,
  getPublicProperties,
  PropertySearchFilters,
} from '@/lib/api/public';
import { PropertyCard } from '@/components/marketplace/PropertyCard';
import { PropertyFilters } from '@/components/marketplace/PropertyFilters';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  FinishingType,
  PaymentMethod,
  PropertyType,
  TransactionType,
} from '@/types/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'العقارات المعتمدة في سوهاج',
  description:
    'ابحث وقارن بين الشقق والفيلات والمحلات والأراضي المعروضة للبيع أو الإيجار في محافظة سوهاج ومدينة سوهاج الجديدة بأسعار الكاش والتقسيط.',
};

interface PropertiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickSingle(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) {
    return val[0];
  }
  return val;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedParams = await searchParams;

  const filters: PropertySearchFilters = {
    q: pickSingle(resolvedParams.q),
    transaction_type: (pickSingle(resolvedParams.transaction_type) as TransactionType) || '',
    property_type: (pickSingle(resolvedParams.property_type) as PropertyType) || '',
    category_id: pickSingle(resolvedParams.category_id),
    location_id: pickSingle(resolvedParams.location_id),
    payment_method: (pickSingle(resolvedParams.payment_method) as PaymentMethod) || '',
    min_price: pickSingle(resolvedParams.min_price),
    max_price: pickSingle(resolvedParams.max_price),
    min_area: pickSingle(resolvedParams.min_area),
    max_area: pickSingle(resolvedParams.max_area),
    bedrooms: pickSingle(resolvedParams.bedrooms),
    bathrooms: pickSingle(resolvedParams.bathrooms),
    finishing_type: (pickSingle(resolvedParams.finishing_type) as FinishingType) || '',
    sort:
      (pickSingle(resolvedParams.sort) as
        | 'newest'
        | 'price_asc'
        | 'price_desc'
        | 'area_desc') || 'newest',
    page: pickSingle(resolvedParams.page) || '1',
    per_page: '12',
  };

  const [propertiesData, categories, locations] = await Promise.all([
    getPublicProperties(filters),
    getPublicCategories(),
    getPublicLocations(),
  ]);

  const cleanSearchParamsForPagination: Record<string, string | number | undefined> = {
    q: filters.q,
    transaction_type: filters.transaction_type,
    property_type: filters.property_type,
    category_id: filters.category_id,
    location_id: filters.location_id,
    payment_method: filters.payment_method,
    min_price: filters.min_price,
    max_price: filters.max_price,
    min_area: filters.min_area,
    max_area: filters.max_area,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    finishing_type: filters.finishing_type,
    sort: filters.sort !== 'newest' ? filters.sort : undefined,
  };

  return (
    <div className="py-10 lg:py-16">
      <Container>
        {/* Warm Luxury Header Banner */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#F3EDE2] p-7 sm:flex-row sm:items-center sm:p-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#136F48] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
              معتمد للنشر — تمت مراجعة البيانات
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-4xl">
              عقارات محافظة سوهاج وسوهاج الجديدة
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A555E]">
              جميع الوحدات المعروضة خضعت لمراجعة البيانات والصور والهيكل المالي لأسعار الكاش والتقسيط.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-6 py-4 shadow-ambient tabular-nums-west">
            <span className="block text-xs font-bold text-[#78828A]">
              إجمالي الوحدات المطابقة
            </span>
            <span className="text-3xl font-extrabold text-[#131E26]">
              {propertiesData.meta.total}
            </span>
            <span className="ms-1.5 text-xs font-bold text-[#A67C33]">وحدة معتمدة</span>
          </div>
        </div>

        {/* Two-Column Living Luxury Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Sidebar Filters */}
          <div className="lg:col-span-4 xl:col-span-3">
            <PropertyFilters
              categories={categories}
              locations={locations}
              initialFilters={filters}
            />
          </div>

          {/* Gallery-First Results Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            {propertiesData.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {propertiesData.items.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>

                <Pagination
                  currentPage={propertiesData.meta.current_page}
                  lastPage={propertiesData.meta.last_page}
                  total={propertiesData.meta.total}
                  basePath="/properties"
                  searchParams={cleanSearchParamsForPagination}
                />
              </>
            ) : (
              <EmptyState
                title="لا توجد وحدات مطابقة لمعايير البحث الحالية"
                description="جرّب تعديل نطاق السعر أو اختيار مدينة أوسع داخل محافظة سوهاج لاستعراض الوحدات المعتمدة."
                actionLabel="إعادة عرض جميع العقارات"
                actionHref="/properties"
              />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
