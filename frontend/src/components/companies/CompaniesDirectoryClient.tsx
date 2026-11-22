'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { BACKEND_URL } from '@/lib/api/client';
import type { CompanyProfile } from '@/types/company';

interface CompaniesDirectoryClientProps {
  initialCompanies: CompanyProfile[];
}

function resolveCompanyMedia(url?: string | null, filePath?: string | null): string | null {
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

export function CompaniesDirectoryClient({
  initialCompanies,
}: CompaniesDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialCompanies.filter((company) => {
      if (verifiedOnly && !company.is_verified) {
        return false;
      }
      if (!q) return true;
      const haystack = [company.name, company.address || '', company.bio || '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [initialCompanies, searchQuery, verifiedOnly]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Capsule */}
      <div className="rounded-3xl bg-white p-5 shadow-ambient sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <label htmlFor="companies-search" className="sr-only">
              ابحث باسم الشركة أو المنطقة
            </label>
            <input
              id="companies-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الشركة أو المنطقة (مثلاً: سوهاج الجديدة، الكوامل، حي الشرق...)"
              className="w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-3.5 text-sm font-medium text-[#403E3D] placeholder:text-[#7D7772] focus:border-[#9F7753] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setVerifiedOnly((prev) => !prev)}
              className={`cursor-pointer rounded-full px-4 py-2.5 text-xs font-bold transition ${
                verifiedOnly
                  ? 'bg-[#403E3D] text-white shadow-xs'
                  : 'bg-[#F3EAD8] text-[#403E3D] hover:bg-[#CEB38F]/50'
              }`}
            >
              {verifiedOnly ? '✔ الشركاء المعتمدون فقط' : 'عرض الشركاء المعتمدين فقط'}
            </button>

            {(searchQuery || verifiedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVerifiedOnly(false);
                }}
                className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[#9F7753] ring-1 ring-[#9F7753]/30 transition hover:bg-[#FAF7F2]"
              >
                مسح الفلتر
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#403E3D]/10 pt-3 text-xs text-[#5C5855]">
          <p className="font-semibold tabular-nums-west">
            إجمالي الشركات المعروضة:{' '}
            <span className="font-extrabold text-[#403E3D]">{filteredCompanies.length}</span>{' '}
            من أصل {initialCompanies.length}
          </p>
          <Link
            href="/register"
            className="font-bold text-[#9F7753] transition hover:text-[#403E3D]"
          >
            هل تمثل شركة تطوير أو مكتباً عقارياً؟ انضم إلينا &#8592;
          </Link>
        </div>
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length > 0 ? (
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => {
            const coverSrc = resolveCompanyMedia(company.cover_url, company.cover_path);
            const logoSrc = resolveCompanyMedia(company.logo_url, company.logo_path);
            const accent = sanitizeHexColor(company.accent_color);
            const propertiesCount = company.properties_count ?? 0;
            const projectsCount = company.projects_count ?? company.projects?.length ?? 0;

            return (
              <article
                key={company.id}
                className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg"
              >
                {/* Cover Banner */}
                <div
                  className="relative h-36 w-full overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, #403E3D 0%, #2F2D2C 55%, ${accent} 100%)`,
                  }}
                >
                  {coverSrc && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={coverSrc}
                      alt={`غلاف ${company.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#403E3D]/70 via-[#403E3D]/20 to-transparent" />

                  {company.is_verified && (
                    <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-[#E8F6EF]/95 px-3 py-1 text-[11px] font-bold text-[#136F48] shadow-xs">
                      <span>✔</span>
                      <span>شريك معتمد</span>
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col px-6 pb-6">
                  {/* Overlapping Logo */}
                  <div className="-mt-10 mb-3 flex items-end justify-between gap-3">
                    <div className="relative z-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#FAF7F2] shadow-md">
                      {logoSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={logoSrc}
                          alt={company.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-extrabold text-[#9F7753]">
                          {company.name.slice(0, 1)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-10 tabular-nums-west">
                      <span className="rounded-full bg-[#F3EAD8] px-3 py-1 text-[11px] font-bold text-[#403E3D]">
                        {projectsCount} مشاريع
                      </span>
                      <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#9F7753]">
                        {propertiesCount} عقار
                      </span>
                    </div>
                  </div>

                  <h2 className="text-lg font-extrabold text-[#403E3D] transition group-hover:text-[#9F7753]">
                    <Link href={`/companies/${company.slug}`}>{company.name}</Link>
                  </h2>

                  {company.address && (
                    <p className="mt-1.5 text-xs font-bold text-[#9F7753]">
                      📍 {company.address}
                    </p>
                  )}

                  <p className="mt-2.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[#5C5855]">
                    {company.bio ||
                      'مطور ومكتب عقاري مسجل على منصة ريزيدنزا لتقديم أفضل الفرص السكنية والاستثمارية في سوهاج.'}
                  </p>

                  <div className="mt-5 pt-4 border-t border-[#403E3D]/10">
                    <Link
                      href={`/companies/${company.slug}`}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#403E3D] px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#9F7753]"
                    >
                      <span>زيارة صفحة الشركة</span>
                      <span aria-hidden="true">&#8592;</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-12 text-center shadow-ambient">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F3EAD8] text-2xl text-[#9F7753]">
            🏢
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-[#403E3D]">
            لا توجد شركات مطابقة لبحثك حالياً
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#5C5855]">
            جرب البحث بكلمة أخرى أو تصفح جميع الشركات والمكاتب العقارية المسجلة على منصة ريزيدنزا.
          </p>
          {(searchQuery || verifiedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setVerifiedOnly(false);
              }}
              className="mt-5 cursor-pointer rounded-full bg-[#9F7753] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#8A6346]"
            >
              عرض كل الشركات
            </button>
          )}
        </div>
      )}
    </div>
  );
}
