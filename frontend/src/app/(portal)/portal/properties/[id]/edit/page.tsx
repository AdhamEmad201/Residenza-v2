'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Category, Location, PortalProperty } from '@/types/api';
import { getPublicCategories, getPublicLocations } from '@/lib/api/public';
import {
  getPortalProperty,
  PortalPropertyPayload,
  resubmitPortalProperty,
  submitPortalProperty,
  updatePortalProperty,
} from '@/lib/api/portal';
import { PropertyForm } from '@/components/dashboard/PropertyForm';
import { MediaAndDocumentsManager } from '@/components/dashboard/MediaAndDocumentsManager';
import {
  AvailabilityStatusBadge,
  ModerationStatusBadge,
  ModerationTimeline,
} from '@/components/dashboard/StatusBadges';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

export default function EditPortalPropertyPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params?.id;

  const [property, setProperty] = useState<PortalProperty | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [propRes, cats, locs] = await Promise.all([
        getPortalProperty(propertyId),
        getPublicCategories(),
        getPublicLocations(),
      ]);
      setProperty(propRes.data ?? null);
      setCategories(cats);
      setLocations(locs);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر تحميل بيانات العقار.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleUpdate = async (payload: PortalPropertyPayload) => {
    if (!property) return;
    setStatusMessage(null);
    const res = await updatePortalProperty(property.id, payload);
    if (res.data) {
      setProperty(res.data);
      setStatusMessage(
        property.moderation_status === 'approved'
          ? 'تم حفظ التعديلات وإعادة العقار تلقائياً إلى حالة (قيد المراجعة) لاعتماد البيانات المحدثة.'
          : 'تم حفظ تعديلات العقار بنجاح.'
      );
    }
  };

  const handleLifecycleSubmit = async (isResubmit: boolean) => {
    if (!property) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = isResubmit
        ? await resubmitPortalProperty(property.id)
        : await submitPortalProperty(property.id);
      if (res.data) {
        setProperty(res.data);
      }
      setStatusMessage('تم إرسال العقار إلى إدارة المراجعة بنجاح.');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'تعذر إرسال العقار للمراجعة.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-xs font-bold text-[#78828A] shadow-ambient">
        جارٍ تحميل ملف العقار والصور والمستندات...
      </div>
    );
  }

  if (!property) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-ambient space-y-4">
        <p className="text-base font-bold text-red-700">
          {errorMessage || 'لم يتم العثور على هذا العقار.'}
        </p>
        <Link
          href="/portal"
          className="inline-block rounded-full bg-[#131E26] px-6 py-2.5 text-xs font-bold text-white"
        >
          العودة إلى عقاراتي
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Property Status Header */}
      <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-[#A67C33] tabular-nums-west">
              {property.reference_code}
            </span>
            <ModerationStatusBadge status={property.moderation_status} />
            <AvailabilityStatusBadge status={property.availability_status} />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {property.moderation_status === 'draft' && (
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => void handleLifecycleSubmit(false)}
              >
                إرسال المسودة للمراجعة الآن
              </Button>
            )}

            {property.moderation_status === 'changes_requested' && (
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => void handleLifecycleSubmit(true)}
              >
                إعادة إرسال للمراجعة بعد الاستيفاء
              </Button>
            )}

            <Link
              href="/portal"
              className="rounded-full bg-[#FAF7F2] px-5 py-2 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
            >
              العودة إلى عقاراتي &#8592;
            </Link>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-[#131E26]">{property.title_ar}</h2>

        {/* Content-Edit Reset Rule Notice */}
        {property.moderation_status === 'approved' && (
          <div className="rounded-2xl bg-[#F7EFE0] p-4 text-xs text-[#8E6722]">
            <strong className="font-bold">تنبيه قاعدة الحوكمة (T8): </strong>
            هذا العقار معتمد ومنشور حالياً. أي تعديل على بياناته أو سعره سيعيده تلقائياً إلى حالة «قيد المراجعة الإدارية» لحين اعتماد التعديلات الجديدة.
          </div>
        )}

        {/* Reviewer Feedback Banner */}
        {property.rejection_reason &&
          (property.moderation_status === 'changes_requested' ||
            property.moderation_status === 'rejected') && (
            <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
              <strong className="font-bold">ملاحظات المراجع الإداري: </strong>
              {property.rejection_reason}
            </div>
          )}

        {statusMessage && (
          <div
            role="status"
            className="rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
          >
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
          >
            {errorMessage}
          </div>
        )}
      </div>

      {/* Media & Private Verification Documents Manager */}
      <MediaAndDocumentsManager
        propertyId={property.id}
        images={property.images}
        documents={property.documents}
        onUpdated={loadWorkspace}
      />

      {/* Property Details Form */}
      <PropertyForm
        mode="portal-edit"
        categories={categories}
        locations={locations}
        initialData={property}
        onSubmit={handleUpdate}
      />

      {/* Moderation Audit Log Timeline */}
      <ModerationTimeline logs={property.moderation_logs} />
    </div>
  );
}
