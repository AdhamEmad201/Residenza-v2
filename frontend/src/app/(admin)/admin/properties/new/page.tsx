'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category, Location } from '@/types/api';
import { getPublicCategories, getPublicLocations } from '@/lib/api/public';
import { adminDirectPublishProperty } from '@/lib/api/admin';
import type { PortalPropertyPayload } from '@/lib/api/portal';
import { PropertyForm } from '@/components/dashboard/PropertyForm';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AdminDirectPublishPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoadingTaxonomy(true);
      const [cats, locs] = await Promise.all([
        getPublicCategories(),
        getPublicLocations(),
      ]);
      if (active) {
        setCategories(cats);
        setLocations(locs);
        setIsLoadingTaxonomy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleDirectPublish = async (payload: PortalPropertyPayload) => {
    const restPayload = { ...payload };
    delete restPayload.submit;
    const res = await adminDirectPublishProperty(restPayload);
    if (res.data?.id) {
      router.push(`/admin/properties/${res.data.id}?published=1`);
    } else {
      router.push('/admin/properties');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#F3EDE2] p-6 sm:p-8">
        <div>
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-bold text-[#136F48]">
            نشر إداري مباشر فوري · القاعدة المعمارية OD-01 = A
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-[#131E26] sm:text-3xl">
            إدراج ونشر عقار معتمد مباشرة
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#4A555E]">
            يتم نشر هذا العقار فوراً في السجل العام بحالة «معتمد للنشر» بتاريخ اللحظة الحالية (`published_at = now()`) مع تسجيل قيد تدقيق `admin_direct_publish` تلقائياً.
          </p>
        </div>

        <Link
          href="/admin/properties"
          className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#131E26] shadow-2xs transition hover:bg-[#131E26] hover:text-white"
        >
          العودة لطابور العقارات &#8592;
        </Link>
      </div>

      {isLoadingTaxonomy ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل التصنيفات والمناطق...
        </div>
      ) : (
        <PropertyForm
          mode="admin-create"
          categories={categories}
          locations={locations}
          defaultPhone={user?.phone || ''}
          defaultWhatsapp={user?.whatsapp_number || user?.phone || ''}
          onSubmit={handleDirectPublish}
        />
      )}
    </div>
  );
}
