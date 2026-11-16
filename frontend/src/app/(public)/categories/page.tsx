import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { getPublicCategories, PROPERTY_TYPE_LABELS } from '@/lib/api/public';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'دليل التصنيفات العقارية في سوهاج',
  description:
    'استعرض دليل التصنيفات العقارية في محافظة سوهاج: الوحدات السكنية، التجارية، الإدارية، والأراضي المعتمدة للنشر.',
};

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  return (
    <div className="py-12 lg:py-20">
      <Container>
        <header className="mb-12 rounded-3xl bg-[#F3EDE2] p-8 sm:p-12">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-bold text-[#A67C33] shadow-2xs">
            دليل التصنيفات العقارية · سوهاج
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-5xl">
            اختر التصنيف العقاري المناسب لبحثك
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4A555E]">
            اختر التصنيف الرئيسي أو الفرعي لاستعراض الوحدات المعتمدة للنشر ضمن القطاع السكني أو التجاري أو الإداري أو قطاع الأراضي في محافظة سوهاج.
          </p>
        </header>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {categories.map((cat) => (
              <article
                key={cat.id}
                className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#8E6722]">
                      {PROPERTY_TYPE_LABELS[cat.property_type]}
                    </span>
                    <Link
                      href={`/properties?category_id=${cat.id}`}
                      className="rounded-full bg-[#FAF7F2] px-4 py-1.5 text-xs font-bold text-[#131E26] transition hover:bg-[#131E26] hover:text-white"
                    >
                      عرض العقارات &#8592;
                    </Link>
                  </div>

                  <h2 className="mt-4 text-2xl font-extrabold text-[#131E26]">
                    <Link
                      href={`/properties?category_id=${cat.id}`}
                      className="transition hover:text-[#A67C33]"
                    >
                      {cat.name_ar}
                    </Link>
                  </h2>
                  {cat.name_en && (
                    <p className="mt-0.5 font-mono text-xs text-[#78828A]">{cat.name_en}</p>
                  )}
                </div>

                <div className="mt-6">
                  {cat.children && cat.children.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {cat.children.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/properties?category_id=${sub.id}`}
                          className="rounded-full bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#131E26] transition-all hover:bg-[#C59B4E] hover:text-white"
                        >
                          {sub.name_ar}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#78828A]">
                      جميع الوحدات المعتمدة ضمن تصنيف {cat.name_ar} في محافظة سوهاج.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="لم يتم العثور على تصنيفات نشطة"
            description="تأكد من تشغيل الخادم الخلفي لتحميل شجرة التصنيفات العقارية."
            actionLabel="العودة للرئيسية"
            actionHref="/"
          />
        )}
      </Container>
    </div>
  );
}
