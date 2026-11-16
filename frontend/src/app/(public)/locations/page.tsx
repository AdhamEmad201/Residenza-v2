import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { getPublicLocations, LOCATION_TYPE_LABELS } from '@/lib/api/public';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'وجهات ومدن محافظة سوهاج',
  description:
    'الدليل الجغرافي الكامل لمدن ومراكز وأحياء وقرى محافظة سوهاج ومدينة سوهاج الجديدة لتصفح العقارات المعتمدة.',
};

export default async function LocationsPage() {
  const locationTree = await getPublicLocations();
  const governorateRoot = locationTree[0];
  const topLevelNodes = governorateRoot?.children || locationTree;

  return (
    <div className="py-12 lg:py-20">
      <Container>
        <header className="mb-12 rounded-3xl bg-[#F3EDE2] p-8 sm:p-12">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-bold text-[#A67C33] shadow-2xs">
            أطلس سوهاج العمراني · 38 منطقة
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-5xl">
            وجهات ومدن ومراكز محافظة سوهاج
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#4A555E]">
            تغطي منصة ريزيدنزا جميع المدن والمراكز الإدارية والأحياء والقرى التابعة لمحافظة سوهاج ومدينة سوهاج الجديدة. اختر أي نطاق جغرافي لاستعراض العقارات المعتمدة فيه.
          </p>
        </header>

        {topLevelNodes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {topLevelNodes.map((node, index) => (
              <article
                key={node.id}
                className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#8E6722] tabular-nums-west">
                      {String(index + 1).padStart(2, '0')} · {LOCATION_TYPE_LABELS[node.type]}
                    </span>
                    <Link
                      href={`/properties?location_id=${node.id}`}
                      className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
                    >
                      عرض العقارات &#8592;
                    </Link>
                  </div>

                  <h2 className="mt-4 text-2xl font-extrabold text-[#131E26]">
                    <Link
                      href={`/properties?location_id=${node.id}`}
                      className="transition hover:text-[#A67C33]"
                    >
                      {node.name_ar}
                    </Link>
                  </h2>
                </div>

                <div className="mt-5">
                  {node.children && node.children.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {node.children.map((child) => (
                        <React.Fragment key={child.id}>
                          <Link
                            href={`/properties?location_id=${child.id}`}
                            className="rounded-full bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#C59B4E] hover:text-white"
                          >
                            {child.name_ar}
                          </Link>
                          {child.children &&
                            child.children.map((grandChild) => (
                              <Link
                                key={grandChild.id}
                                href={`/properties?location_id=${grandChild.id}`}
                                className="rounded-full bg-[#F3EDE2] px-3.5 py-1.5 text-xs font-semibold text-[#4A555E] transition hover:bg-[#131E26] hover:text-white"
                              >
                                {grandChild.name_ar}
                              </Link>
                            ))}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#78828A]">
                      نطاق عمراني مباشر في محافظة سوهاج
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="تعذر تحميل شجرة مناطق سوهاج"
            description="يرجى التأكد من اتصال الواجهة الأمامية بالخادم الخلفي."
            actionLabel="العودة للرئيسية"
            actionHref="/"
          />
        )}
      </Container>
    </div>
  );
}
