'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, BACKEND_URL } from '@/lib/api/client';
import {
  createMyCompanyProject,
  deleteMyCompanyProject,
  getMyCompany,
  upsertMyCompany,
} from '@/lib/api/portal';
import { useAuth } from '@/lib/auth/AuthContext';
import type { CompanyProfile, CompanyProject } from '@/types/company';

const PRESET_ACCENT_COLORS = [
  { hex: '#9F7753', label: 'برونزي ريزيدنزا' },
  { hex: '#403E3D', label: 'فحمي كلاسيكي' },
  { hex: '#136F48', label: 'زمردي عقاري' },
  { hex: '#1E3A8A', label: 'كحلي ملكي' },
  { hex: '#7C2D12', label: 'نحاسي دافئ' },
];

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

function sanitizeHexColor(raw?: string | null): string {
  return raw && /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : '#9F7753';
}

function slugifyPreview(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CompanyDashboardPage() {
  const { user } = useAuth();

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Company Branding Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [accentColor, setAccentColor] = useState('#9F7753');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Project Creation Form State
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCoverFile, setProjectCoverFile] = useState<File | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCompany() {
      setIsLoading(true);
      try {
        const res = await getMyCompany();
        if (!active) return;
        const data = res.data ?? null;
        if (data) {
          setCompany(data);
          setProjects(data.projects ?? []);
          setName(data.name || '');
          setSlug(data.slug || '');
          setBio(data.bio || '');
          setAddress(data.address || '');
          setPhone(data.phone || user?.phone || '');
          setWhatsapp(data.whatsapp || user?.whatsapp_number || user?.phone || '');
          setAccentColor(data.accent_color || '#9F7753');
        } else {
          setName(user?.company_name || user?.name || '');
          setPhone(user?.phone || '');
          setWhatsapp(user?.whatsapp_number || user?.phone || '');
        }
      } catch {
        // Fallback to user defaults if no company profile exists yet
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadCompany();
    return () => {
      active = false;
    };
  }, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setLogoPreviewUrl(URL.createObjectURL(file));
    } else {
      setLogoPreviewUrl(null);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) {
      setCoverPreviewUrl(URL.createObjectURL(file));
    } else {
      setCoverPreviewUrl(null);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setCompanyMessage(null);
    setCompanyError(null);
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (slug.trim()) {
        formData.append('slug', slug.trim());
      }
      formData.append('bio', bio.trim());
      formData.append('address', address.trim());
      formData.append('phone', phone.trim());
      formData.append('whatsapp', whatsapp.trim());
      formData.append('accent_color', accentColor);

      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const res = await upsertMyCompany(formData);
      if (res.data) {
        setCompany(res.data);
        setProjects(res.data.projects ?? projects);
        setName(res.data.name);
        setSlug(res.data.slug);
        setLogoFile(null);
        setCoverFile(null);
      }
      setCompanyMessage(res.message || 'تم حفظ هوية الشركة وصفحتك العامة بنجاح.');
    } catch (error) {
      if (error instanceof ApiError) {
        setCompanyError(error.message);
        if (error.errors) {
          setFieldErrors(error.errors);
        }
      } else {
        setCompanyError('حدث خطأ أثناء حفظ بيانات الشركة. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      setProjectError('يرجى حفظ بيانات الشركة الأساسية أولاً قبل إضافة المشروعات.');
      return;
    }

    setIsCreatingProject(true);
    setProjectMessage(null);
    setProjectError(null);

    try {
      const formData = new FormData();
      formData.append('name', projectName.trim());
      formData.append('location', projectLocation.trim());
      if (projectDescription.trim()) {
        formData.append('description', projectDescription.trim());
      }
      if (projectCoverFile) {
        formData.append('cover', projectCoverFile);
      }

      const res = await createMyCompanyProject(formData);
      if (res.data) {
        setProjects((prev) => [res.data!, ...prev]);
        setProjectName('');
        setProjectLocation('');
        setProjectDescription('');
        setProjectCoverFile(null);
      }
      setProjectMessage(res.message || 'تم إضافة المشروع العقاري بنجاح.');
    } catch (error) {
      if (error instanceof ApiError) {
        setProjectError(error.message);
      } else {
        setProjectError('تعذر إضافة المشروع حالياً.');
      }
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    setDeletingProjectId(projectId);
    setProjectMessage(null);
    setProjectError(null);

    try {
      await deleteMyCompanyProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setProjectMessage('تم حذف المشروع بنجاح.');
    } catch (error) {
      if (error instanceof ApiError) {
        setProjectError(error.message);
      } else {
        setProjectError('تعذر حذف المشروع حالياً.');
      }
    } finally {
      setDeletingProjectId(null);
    }
  };

  const safeAccentColor = sanitizeHexColor(accentColor);
  const effectiveLogoPreview =
    logoPreviewUrl || resolveMediaUrl(company?.logo_url, company?.logo_path);
  const effectiveCoverPreview =
    coverPreviewUrl || resolveMediaUrl(company?.cover_url, company?.cover_path);
  const effectiveSlugPreview =
    slug.trim() || company?.slug || slugifyPreview(name) || 'my-agency';

  return (
    <DashboardShell mode="portal">
      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-ambient">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9F7753] border-t-transparent" />
          <p className="mt-3 text-xs font-bold text-[#403E3D]">
            جارٍ تحميل إعدادات هوية الشركة والمتجر العقاري...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Action & Live Public Storefront Preview Banner */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-white p-6 shadow-ambient sm:flex-row sm:items-center sm:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F3EAD8] px-3.5 py-1 text-xs font-bold text-[#8A6346]">
                  هوية الشركة والمتجر العقاري المخصص
                </span>
                {company?.is_verified && (
                  <span className="rounded-full bg-[#E8F6EF] px-3 py-1 text-xs font-bold text-[#136F48]">
                    ✔ شريك معتمد
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-[#403E3D] sm:text-2xl">
                إدارة صفحة شركتك وعلامتك التجارية على ريزيدنزا
              </h2>
              <p className="mt-1 text-xs text-[#5C5855]">
                خصص شعار شركتك، صورة الغلاف، اللون المميز، والمشاريع العقارية ليحصل عملاؤك على رابط مباشر لمتجرك العقاري.
              </p>
            </div>

            {company?.slug ? (
              <Link
                href={`/companies/${company.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#9F7753] px-6 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8A6346]"
              >
                <span>معاينة صفحتي العامة</span>
                <span aria-hidden="true">&#8599;</span>
              </Link>
            ) : (
              <span className="rounded-full bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#7D7772]">
                احفظ البيانات لتفعيل رابط المعاينة العامة
              </span>
            )}
          </div>

          {/* Live Visual Storefront Header Preview Card */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-ambient">
            <div
              className="relative h-40 w-full overflow-hidden sm:h-48"
              style={{
                background: `linear-gradient(135deg, #403E3D 0%, #2F2D2C 52%, ${safeAccentColor} 100%)`,
              }}
            >
              {effectiveCoverPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveCoverPreview}
                  alt="معاينة الغلاف"
                  className="h-full w-full object-cover opacity-85"
                />
              )}
              <div className="bg-destination-scrim pointer-events-none absolute inset-0" />
              <span className="absolute start-5 top-4 rounded-full bg-[#403E3D]/85 px-3.5 py-1 text-[11px] font-bold text-[#FAF7F2]">
                معاينة حية لهوية المتجر
              </span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-3 pb-6 sm:px-8">
              <div className="flex items-end gap-4">
                <div className="-mt-14 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-[#FAF7F2] shadow-md">
                  {effectiveLogoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveLogoPreview}
                      alt="معاينة الشعار"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-extrabold text-[#9F7753]">
                      {(name || 'R').slice(0, 1)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#403E3D] sm:text-xl">
                    {name || 'اسم الشركة العقارية'}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5C5855]" dir="ltr">
                    residenza.com/companies/{effectiveSlugPreview}
                  </p>
                </div>
              </div>

              <div
                className="rounded-full px-4 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: safeAccentColor }}
              >
                اللون المميز للشركة
              </div>
            </div>
          </div>

          {/* Section 1: Company Branding & Contact Form */}
          <form
            onSubmit={handleSaveCompany}
            className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8"
            noValidate
          >
            <h3 className="text-lg font-extrabold text-[#403E3D]">
              1. البيانات الأساسية والهوية البصرية
            </h3>

            {companyMessage && (
              <div
                role="status"
                className="mt-4 rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
              >
                {companyMessage}
              </div>
            )}

            {companyError && (
              <div
                role="alert"
                className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
              >
                {companyError}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="اسم الشركة أو الوكالة العقارية"
                required
                placeholder="مثال: شركة النخبة للتطوير العقاري"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name?.[0]}
              />

              <div>
                <Input
                  label="الرابط المخصص لصفحة الشركة (Slug)"
                  dir="ltr"
                  placeholder="el-nokhba-developments"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  error={fieldErrors.slug?.[0]}
                  hint={`رابط صفحتك: residenza.com/companies/${effectiveSlugPreview}`}
                />
              </div>

              <Input
                label="رقم الهاتف للتواصل المباشر"
                dir="ltr"
                placeholder="010xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors.phone?.[0]}
              />

              <Input
                label="رقم واتساب لاستقبال طلبات العملاء"
                dir="ltr"
                placeholder="010xxxxxxxx"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                error={fieldErrors.whatsapp?.[0]}
              />

              <div className="sm:col-span-2">
                <Input
                  label="عنوان المقر الرئيسي للشركة"
                  placeholder="مثال: مدينة سوهاج الجديدة - الحي الأول - بجوار جهاز المدينة"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  error={fieldErrors.address?.[0]}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-[#403E3D]">
                  نبذة تعريفية عن الشركة ومجالات تخصصها (Bio)
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن خبرة الشركة، مشروعاتها في سوهاج وسوهاج الجديدة، وأنظمة السداد المتاحة..."
                  className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] p-4 text-xs leading-relaxed text-[#403E3D] placeholder:text-[#7D7772] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                />
                {fieldErrors.bio?.[0] && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    {fieldErrors.bio[0]}
                  </p>
                )}
              </div>

              {/* Logo Upload */}
              <div className="rounded-2xl bg-[#FAF7F2] p-5">
                <label className="block text-xs font-bold text-[#403E3D]">
                  شعار الشركة (Company Logo)
                </label>
                <p className="mt-1 text-[11px] text-[#5C5855]">
                  يفضل صورة مربعة بصيغة PNG أو WebP أو JPG (بحد أقصى 5 ميجابايت).
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="mt-3 block w-full cursor-pointer text-xs text-[#403E3D] file:me-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#403E3D] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#2F2D2C]"
                />
                {fieldErrors.logo?.[0] && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    {fieldErrors.logo[0]}
                  </p>
                )}
              </div>

              {/* Cover Banner Upload */}
              <div className="rounded-2xl bg-[#FAF7F2] p-5">
                <label className="block text-xs font-bold text-[#403E3D]">
                  صورة غلاف الصفحة (Cover Banner)
                </label>
                <p className="mt-1 text-[11px] text-[#5C5855]">
                  صورة عريضة لواجهة مشروعاتك (بحد أقصى 8 ميجابايت).
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverChange}
                  className="mt-3 block w-full cursor-pointer text-xs text-[#403E3D] file:me-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#9F7753] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#8A6346]"
                />
                {fieldErrors.cover?.[0] && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    {fieldErrors.cover[0]}
                  </p>
                )}
              </div>

              {/* Brand Accent Color Picker */}
              <div className="rounded-2xl bg-[#FAF7F2] p-5 sm:col-span-2">
                <label className="block text-xs font-bold text-[#403E3D]">
                  اللون المميز لهوية الشركة (Brand Accent Color)
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {PRESET_ACCENT_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setAccentColor(preset.hex)}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        accentColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'bg-[#403E3D] text-white shadow-xs'
                          : 'bg-white text-[#403E3D] hover:bg-[#F3EAD8]'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#403E3D]">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span dir="ltr" className="font-mono text-[11px]">
                      {accentColor}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button
                type="submit"
                variant="gold"
                size="lg"
                isLoading={isSavingCompany}
              >
                حفظ هوية الشركة وتحديث الصفحة العامة
              </Button>
            </div>
          </form>

          {/* Section 2: Company Projects (Compounds / Towers) Manager */}
          <div className="rounded-3xl bg-white p-6 shadow-ambient sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-[#403E3D]">
                  2. المشاريع والكمبوندات والأبراج التابعة للشركة
                </h3>
                <p className="mt-1 text-xs text-[#5C5855]">
                  أضف مشاريعك العقارية لتظهر في تبويب «المشاريع والكمبوندات» داخل صفحتك العامة ولتتمكن من ربط وحداتك بها.
                </p>
              </div>
              <span className="rounded-full bg-[#F3EAD8] px-3.5 py-1 text-xs font-bold text-[#8A6346] tabular-nums-west">
                {projects.length} مشروع مسجل
              </span>
            </div>

            {projectMessage && (
              <div
                role="status"
                className="mt-4 rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
              >
                {projectMessage}
              </div>
            )}

            {projectError && (
              <div
                role="alert"
                className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
              >
                {projectError}
              </div>
            )}

            {/* Add New Project Form */}
            <form
              onSubmit={handleCreateProject}
              className="mt-6 rounded-2xl bg-[#FAF7F2] p-5"
              noValidate
            >
              <h4 className="text-xs font-extrabold text-[#403E3D]">
                إضافة مشروع أو كمبوند جديد
              </h4>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="اسم المشروع / الكمبوند / البرج"
                  required
                  className="bg-white"
                  placeholder="مثال: كمبوند ريزيدنزا الكوامل"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />

                <Input
                  label="الموقع / الحي"
                  required
                  className="bg-white"
                  placeholder="مثال: مدينة سوهاج الجديدة - الحي الثاني"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                />

                <div className="sm:col-span-2">
                  <Input
                    label="وصف مختصر للمشروع (اختياري)"
                    className="bg-white"
                    placeholder="مثال: مشروع سكني متكامل الخدمات بمساحات تبدأ من 120 م² وتسهيلات حتى 60 شهراً"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#403E3D]">
                    صورة غلاف المشروع (اختياري)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setProjectCoverFile(e.target.files?.[0] ?? null)}
                    className="mt-2 block w-full cursor-pointer text-xs text-[#403E3D] file:me-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#403E3D] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isCreatingProject}
                  disabled={!projectName.trim() || !projectLocation.trim()}
                >
                  + إضافة المشروع
                </Button>
              </div>
            </form>

            {/* Existing Projects List */}
            {projects.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projects.map((proj) => {
                  const projCover = resolveMediaUrl(proj.cover_url, proj.cover_path);
                  return (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[#403E3D]/10 bg-[#FAF7F2] p-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="bg-nile-luxury flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-[#CEB38F]">
                          {projCover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={projCover}
                              alt={proj.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            proj.name.slice(0, 2)
                          )}
                        </div>
                        <div>
                          <h5 className="text-sm font-extrabold text-[#403E3D]">
                            {proj.name}
                          </h5>
                          <p className="text-xs font-semibold text-[#9F7753]">
                            📍 {proj.location}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        disabled={deletingProjectId === proj.id}
                        className="cursor-pointer rounded-full bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingProjectId === proj.id ? 'جارٍ الحذف...' : 'حذف'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
