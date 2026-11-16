'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category, Location } from '@/types/api';
import { getPublicCategories, getPublicLocations } from '@/lib/api/public';
import { createPortalProperty, PortalPropertyPayload } from '@/lib/api/portal';
import { PropertyForm } from '@/components/dashboard/PropertyForm';
import { useAuth } from '@/lib/auth/AuthContext';

export default function NewPortalPropertyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadTaxonomy() {
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
    void loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (payload: PortalPropertyPayload) => {
    const res = await createPortalProperty(payload);
    if (res.data?.id) {
      router.push(`/portal/properties/${res.data.id}/edit?created=1`);
    } else {
      router.push('/portal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#F3EDE2] p-6 sm:p-8">
        <div>
          <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#A67C33]">
            طرح عقار جديد · محافظة سوهاج
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-[#131E26] sm:text-3xl">
            إدراج وحدة عقارية جديدة
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#4A555E]">
            أدخل البيانات الأساسية والمالية للعقار، وبعد الحفظ ستنتقل مباشرة لرفع الصور العامة ومستندات إثبات الملكية أو التفويض.
          </p>
        </div>

        <Link
          href="/portal"
          className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#131E26] shadow-2xs transition hover:bg-[#131E26] hover:text-white"
        >
          العودة إلى عقاراتي &#8592;
        </Link>
      </div>

      {isLoadingTaxonomy ? (
        <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
          جارٍ تحميل شجرة التصنيفات ومناطق سوهاج...
        </div>
      ) : (
        <PropertyForm
          mode="portal-create"
          categories={categories}
          locations={locations}
          defaultPhone={user?.phone || ''}
          defaultWhatsapp={user?.whatsapp_number || user?.phone || ''}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
