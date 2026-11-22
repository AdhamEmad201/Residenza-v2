import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { getPublicCompanies } from '@/lib/api/public';
import { CompaniesDirectoryClient } from '@/components/companies/CompaniesDirectoryClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'الشركات والمطورون العقاريون | ريزيدنزا سوهاج',
  description:
    'تصفح دليل شركات التطوير العقاري والمكاتب والوكالات المعتمدة في سوهاج وسوهاج الجديدة واستكشف مشاريعهم وكمبونداتهم.',
};

export default async function CompaniesDirectoryPage() {
  const companies = await getPublicCompanies({ per_page: 50 });

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-10">
        {/* Branded Directory Header */}
        <section className="relative overflow-hidden rounded-3xl bg-[#403E3D] px-6 py-10 text-white shadow-ambient-lg sm:px-12 sm:py-14">
          <div
            className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{ backgroundColor: '#9F7753' }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: '#CEB38F' }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#9F7753]/25 px-4 py-1.5 text-xs font-bold text-[#F3EAD8]">
                <span>دليل الشركاء العقاريين</span>
                <span className="text-[#CEB38F]">•</span>
                <span>سوهاج وسوهاج الجديدة</span>
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                الشركات والمطورون العقاريون
              </h1>
              <p className="text-sm leading-relaxed text-[#F3EAD8]/90 sm:text-base">
                اكتشف نخبة شركات التطوير العقاري والمكاتب التسويقية في محافظة سوهاج. تصفح واجهة كل شركة، مشاريعها وكمبونداتها، وتواصل مباشرة عبر الهاتف أو الواتساب.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/properties"
                className="rounded-full bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20"
              >
                تصفح كل العقارات
              </Link>
              <Link
                href="/dashboard/company"
                className="rounded-full bg-[#9F7753] px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#8A6346]"
              >
                أنشئ صفحة شركتك
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Searchable Companies Grid */}
        <CompaniesDirectoryClient initialCompanies={companies} />
      </Container>
    </div>
  );
}
