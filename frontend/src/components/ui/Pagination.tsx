import React from 'react';
import Link from 'next/link';

export interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  basePath?: string;
  searchParams?: Record<string, string | number | undefined>;
}

function buildPageHref(
  basePath: string,
  page: number,
  searchParams?: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key !== 'page' && value !== undefined && String(value).trim() !== '') {
        params.set(key, String(value));
      }
    }
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  basePath = '/properties',
  searchParams,
}: PaginationProps) {
  if (lastPage <= 1) {
    return null;
  }

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, currentPage + 2);

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return (
    <nav
      aria-label="التنقل بين الصفحات"
      className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#DFD9CE] pt-6 sm:flex-row"
    >
      <p className="text-xs text-[#4A4843] tabular-nums-west">
        الصفحة <span className="font-bold text-[#121417]">{currentPage}</span> من{' '}
        <span className="font-bold text-[#121417]">{lastPage}</span> — إجمالي السجل:{' '}
        <span className="font-bold text-[#9A783C]">{total}</span> عقار معتمد
      </p>

      <div className="flex items-center gap-1 tabular-nums-west">
        {currentPage > 1 ? (
          <Link
            href={buildPageHref(basePath, currentPage - 1, searchParams)}
            className="inline-flex items-center border border-[#C9C0B1] bg-transparent px-3.5 py-2 text-xs font-bold text-[#121417] transition hover:border-[#121417] hover:bg-[#121417] hover:text-[#F7F5F0]"
          >
            السابق
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center border border-[#DFD9CE] px-3.5 py-2 text-xs font-medium text-[#78736A]/50">
            السابق
          </span>
        )}

        {start > 1 && (
          <>
            <Link
              href={buildPageHref(basePath, 1, searchParams)}
              className="inline-flex h-9 w-9 items-center justify-center border border-[#DFD9CE] text-xs font-semibold text-[#121417] transition hover:border-[#121417]"
            >
              1
            </Link>
            {start > 2 && <span className="px-1 text-xs text-[#78736A]">…</span>}
          </>
        )}

        {pages.map((page) => {
          const isActive = page === currentPage;
          return (
            <Link
              key={page}
              href={buildPageHref(basePath, page, searchParams)}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center border text-xs font-bold transition ${
                isActive
                  ? 'border-[#121417] bg-[#121417] text-[#F7F5F0]'
                  : 'border-[#DFD9CE] bg-transparent text-[#121417] hover:border-[#121417]'
              }`}
            >
              {page}
            </Link>
          );
        })}

        {end < lastPage && (
          <>
            {end < lastPage - 1 && <span className="px-1 text-xs text-[#78736A]">…</span>}
            <Link
              href={buildPageHref(basePath, lastPage, searchParams)}
              className="inline-flex h-9 w-9 items-center justify-center border border-[#DFD9CE] text-xs font-semibold text-[#121417] transition hover:border-[#121417]"
            >
              {lastPage}
            </Link>
          </>
        )}

        {currentPage < lastPage ? (
          <Link
            href={buildPageHref(basePath, currentPage + 1, searchParams)}
            className="inline-flex items-center border border-[#C9C0B1] bg-transparent px-3.5 py-2 text-xs font-bold text-[#121417] transition hover:border-[#121417] hover:bg-[#121417] hover:text-[#F7F5F0]"
          >
            التالي
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center border border-[#DFD9CE] px-3.5 py-2 text-xs font-medium text-[#78736A]/50">
            التالي
          </span>
        )}
      </div>
    </nav>
  );
}
