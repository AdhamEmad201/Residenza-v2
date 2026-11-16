'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { AdminProperty, Category, Location } from '@/types/api';
import { ACCOUNT_TYPE_LABELS, getPublicCategories, getPublicLocations } from '@/lib/api/public';
import { adminUpdateProperty, getAdminProperty } from '@/lib/api/admin';
import type { PortalPropertyPayload } from '@/lib/api/portal';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  AvailabilityStatusBadge,
  ModerationStatusBadge,
  ModerationTimeline,
} from '@/components/dashboard/StatusBadges';
import { ModerationActionPanel } from '@/components/dashboard/ModerationActionPanel';
import { MediaAndDocumentsManager } from '@/components/dashboard/MediaAndDocumentsManager';
import { PropertyForm } from '@/components/dashboard/PropertyForm';
import { ApiError } from '@/lib/api/client';

export default function AdminPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const propertyId = params?.id;

  const [property, setProperty] = useState<AdminProperty | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [propRes, cats, locs] = await Promise.all([
        getAdminProperty(propertyId),
        getPublicCategories(),
        getPublicLocations(),
      ]);
      setProperty(propRes.data ?? null);
      setCategories(cats);
      setLocations(locs);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر تحميل ملف العقار.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleAdminContentUpdate = async (payload: PortalPropertyPayload) => {
    if (!property) return;
    setStatusMessage(null);
    const restPayload = { ...payload };
    delete restPayload.submit;
    const res = await adminUpdateProperty(property.id, restPayload);
    if (res.data) {
      setProperty(res.data);
      setStatusMessage('تم تحديث بيانات العقار إدارياً بنجاح.');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
        جارٍ تحميل ملف العقار والمستندات الثبوتية...
      </div>
    );
  }

  if (!property || !user) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-ambient space-y-4">
        <p className="text-base font-bold text-red-700">
          {errorMessage || 'لم يتم العثور على العقار.'}
        </p>
        <Link
          href="/admin/properties"
          className="inline-block rounded-full bg-[#131E26] px-6 py-2.5 text-xs font-bold text-white"
        >
          العودة إلى طابور العقارات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-[#A67C33] tabular-nums-west">
              {property.reference_code}
            </span>
            <ModerationStatusBadge status={property.moderation_status} />
            <AvailabilityStatusBadge status={property.availability_status} />
          </div>

          <div className="flex items-center gap-2.5">
            {property.moderation_status === 'approved' && (
              <Link
                href={`/properties/${property.slug}`}
                className="rounded-full bg-[#E8F6EF] px-4 py-2 text-xs font-bold text-[#136F48] transition hover:bg-[#136F48] hover:text-white"
              >
                معاينة الصفحة العامة &#8592;
              </Link>
            )}
            <Link
              href="/admin/properties"
              className="rounded-full bg-[#FAF7F2] px-5 py-2 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
            >
              العودة لطابور العقارات &#8592;
            </Link>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-extrabold text-[#131E26] sm:text-3xl">
          {property.title_ar}
        </h2>

        {/* Publisher Identity Strip */}
        {property.user && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-[#FAF7F2] p-4 text-xs">
            <span>
              المعلن: <strong className="text-[#131E26]">{property.user.name}</strong>
            </span>
            <span className="rounded-full bg-[#F7EFE0] px-3 py-0.5 font-bold text-[#8E6722]">
              {ACCOUNT_TYPE_LABELS[property.user.account_type]}
            </span>
            <span dir="ltr" className="font-mono text-[#4A555E]">
              {property.user.phone}
            </span>
            <span className="font-mono text-[#78828A]">{property.user.email}</span>
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="mt-4 rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
          >
            {statusMessage}
          </div>
        )}
      </div>

      {/* Two-Column Review Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          {/* Media & Private Verification Documents Vault */}
          <MediaAndDocumentsManager
            propertyId={property.id}
            images={property.images}
            documents={property.documents}
            onUpdated={loadDetail}
          />

          {/* Editable Property Details Form */}
          <PropertyForm
            mode="admin-edit"
            categories={categories}
            locations={locations}
            initialData={property}
            onSubmit={handleAdminContentUpdate}
          />

          {/* Moderation Timeline */}
          <ModerationTimeline logs={property.moderation_logs} />
        </div>

        {/* Sticky Moderation Decision Panel (with Self-Approval Guard) */}
        <div className="lg:col-span-4">
          <div className="sticky top-28">
            <ModerationActionPanel
              property={property}
              currentUser={user}
              onUpdated={loadDetail}
              onDeleted={() => router.push('/admin/properties')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
