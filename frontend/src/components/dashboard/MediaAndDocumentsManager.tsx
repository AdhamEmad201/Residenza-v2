'use client';

import React, { useState } from 'react';
import type { DocumentType, PropertyDocument, PropertyImage } from '@/types/api';
import {
  deletePortalPropertyDocument,
  deletePortalPropertyImage,
  getDocumentDownloadUrl,
  setPortalPrimaryImage,
  uploadPortalPropertyDocument,
  uploadPortalPropertyImages,
} from '@/lib/api/portal';
import { BACKEND_URL, ApiError } from '@/lib/api/client';
import { DOCUMENT_TYPE_LABELS, DocumentTypeBadge } from './StatusBadges';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export interface MediaAndDocumentsManagerProps {
  propertyId: number;
  images?: PropertyImage[];
  documents?: PropertyDocument[];
  onUpdated: () => Promise<void> | void;
  readOnlyMedia?: boolean;
}

function resolveImgUrl(img: PropertyImage): string {
  if (img.url) {
    return img.url.startsWith('http')
      ? img.url
      : `${BACKEND_URL}${img.url.startsWith('/') ? img.url : `/${img.url}`}`;
  }
  return `${BACKEND_URL}/storage/${img.file_path.replace(/^\/+/, '')}`;
}

export function MediaAndDocumentsManager({
  propertyId,
  images = [],
  documents = [],
  onUpdated,
  readOnlyMedia = false,
}: MediaAndDocumentsManagerProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [docType, setDocType] = useState<DocumentType>('ownership_proof');
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (selectedImages.length === 0) {
      setErrorMessage('يرجى اختيار صورة واحدة على الأقل (حتى 15 صورة).');
      return;
    }
    if (selectedImages.length > 15) {
      setErrorMessage('الحد الأقصى للرفع هو 15 صورة للعقار.');
      return;
    }
    for (const f of selectedImages) {
      if (f.size > 5 * 1024 * 1024) {
        setErrorMessage(`حجم الصورة (${f.name}) يتجاوز الحد الأقصى المسموح (5MB).`);
        return;
      }
    }

    setBusyMessage('جارٍ رفع صور العقار...');
    try {
      await uploadPortalPropertyImages(propertyId, selectedImages);
      setSelectedImages([]);
      await onUpdated();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('تعذر رفع الصور حالياً.');
      }
    } finally {
      setBusyMessage(null);
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    setErrorMessage(null);
    setBusyMessage('جارٍ تعيين الصورة الرئيسية...');
    try {
      await setPortalPrimaryImage(propertyId, imageId);
      await onUpdated();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      }
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    setErrorMessage(null);
    setBusyMessage('جارٍ حذف الصورة...');
    try {
      await deletePortalPropertyImage(propertyId, imageId);
      await onUpdated();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      }
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedDoc) {
      setErrorMessage('يرجى اختيار ملف المستند الثبوتي (PDF أو صورة حتى 10MB).');
      return;
    }
    if (selectedDoc.size > 10 * 1024 * 1024) {
      setErrorMessage('حجم المستند يتجاوز الحد الأقصى المسموح (10MB).');
      return;
    }

    setBusyMessage('جارٍ تشفير وحفظ المستند في الخزينة الخاصة...');
    try {
      await uploadPortalPropertyDocument(propertyId, docType, selectedDoc);
      setSelectedDoc(null);
      await onUpdated();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('تعذر رفع المستند حالياً.');
      }
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    setErrorMessage(null);
    setBusyMessage('جارٍ حذف المستند...');
    try {
      await deletePortalPropertyDocument(propertyId, documentId);
      await onUpdated();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      }
    } finally {
      setBusyMessage(null);
    }
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {busyMessage && (
        <div className="rounded-2xl bg-[#F7EFE0] p-4 text-xs font-bold text-[#8E6722]">
          {busyMessage}
        </div>
      )}

      {/* Public Gallery Images Card */}
      <section className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-[#C59B4E]">
              معرض الصور العام (القرص العام Public Disk)
            </span>
            <h3 className="text-lg font-extrabold text-[#131E26]">
              صور العقار ({images.length} / 15)
            </h3>
          </div>
          <span className="text-xs text-[#78828A]">
            الصيغ المدعومة: JPG, PNG, WEBP (بحد أقصى 5MB للصورة، وأبعاد 300x300 فأعلى)
          </span>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-2xl bg-[#FAF7F2] p-2"
              >
                <div className="relative aspect-4/3 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImgUrl(img)}
                    alt="صورة العقار"
                    className="h-full w-full object-cover"
                  />
                  {img.is_primary && (
                    <span className="absolute start-2 top-2 rounded-full bg-[#136F48] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      الصورة الرئيسية ★
                    </span>
                  )}
                </div>

                {!readOnlyMedia && (
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    {!img.is_primary ? (
                      <button
                        type="button"
                        onClick={() => void handleSetPrimary(img.id)}
                        className="cursor-pointer rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#131E26] shadow-2xs transition hover:bg-[#131E26] hover:text-white"
                      >
                        تعيين رئيسية
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-[#136F48] ps-1">
                        غلاف الإعلان
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDeleteImage(img.id)}
                      className="cursor-pointer rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-700 hover:text-white"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#FAF7F2] p-6 text-center text-xs text-[#78828A]">
            لم يتم إرفاق صور لهذا العقار بعد.
          </div>
        )}

        {!readOnlyMedia && (
          <form onSubmit={handleImageUpload} className="flex flex-wrap items-end gap-4 pt-2">
            <div className="flex-1 min-w-[240px]">
              <label
                htmlFor="property-images-input"
                className="block text-xs font-bold text-[#131E26] mb-1.5"
              >
                إضافة صور جديدة
              </label>
              <input
                id="property-images-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setSelectedImages(e.target.files ? Array.from(e.target.files) : [])
                }
                className="w-full rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs text-[#131E26] file:me-3 file:rounded-full file:border-0 file:bg-[#131E26] file:px-3.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
            </div>

            <Button type="submit" variant="primary" size="md">
              رفع الصور ({selectedImages.length})
            </Button>
          </form>
        )}
      </section>

      {/* Private Verification Documents Vault Card */}
      <section className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8 space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F6EF] px-3 py-1 text-[11px] font-bold text-[#136F48]">
            خزينة المستندات الخاصة (Private Disk — معزولة عن الجمهور)
          </span>
          <h3 className="mt-2 text-lg font-extrabold text-[#131E26]">
            مستندات التحقق والملكية ({documents.length})
          </h3>
          <p className="mt-1 text-xs text-[#4A555E]">
            تُستخدم هذه الوثائق حصرياً من قِبل إدارة المراجعة في ريزيدنزا ولا تظهر للزوار إطلاقاً.
          </p>
        </div>

        {documents.length > 0 ? (
          <ul className="space-y-2.5">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FAF7F2] px-4 py-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <DocumentTypeBadge documentType={doc.document_type} />
                  <span className="font-bold text-[#131E26]">{doc.original_name}</span>
                  <span className="text-[11px] text-[#78828A] tabular-nums-west">
                    ({Math.round(doc.file_size_bytes / 1024)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getDocumentDownloadUrl(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#131E26] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#C59B4E]"
                  >
                    استعراض / تنزيل آمن
                  </a>

                  {!readOnlyMedia && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDocument(doc.id)}
                      className="cursor-pointer rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-700 hover:text-white"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-[#FAF7F2] p-6 text-center text-xs text-[#78828A]">
            لا توجد مستندات ثبوتية مرفوعة لهذا العقار.
          </div>
        )}

        {!readOnlyMedia && (
          <form
            onSubmit={handleDocumentUpload}
            className="grid grid-cols-1 items-end gap-4 pt-2 sm:grid-cols-12"
          >
            <div className="sm:col-span-4">
              <Select
                label="نوع المستند الثبوتي"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                options={Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="property-doc-input"
                className="block text-xs font-bold text-[#131E26] mb-1.5"
              >
                ملف المستند (PDF, JPG, PNG, WEBP — حتى 10MB)
              </label>
              <input
                id="property-doc-input"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedDoc(e.target.files?.[0] || null)}
                className="w-full rounded-2xl bg-[#FAF7F2] px-4 py-2.5 text-xs text-[#131E26] file:me-3 file:rounded-full file:border-0 file:bg-[#131E26] file:px-3.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <Button type="submit" variant="gold" size="md" fullWidth>
                رفع المستند الخاص
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
