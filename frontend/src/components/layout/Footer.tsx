import React from 'react';
import Link from 'next/link';
import { Container } from './Container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-nile-luxury text-[#FAF7F2] mt-16">
      <Container className="py-20">
        {/* Top Organic Luxury Banner */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-white/[0.04] p-8 backdrop-blur-md lg:flex-row lg:items-center">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-[#C59B4E]/20 px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#E5C378]">
              RESIDENZA LIVING LUXURY · SOHAG
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              ريزيدنزا — وجهتك العقارية الموثوقة في محافظة سوهاج
            </h2>
          </div>

          <div className="inline-flex items-center gap-2.5 rounded-full bg-[#E8F6EF]/15 px-5 py-2.5 text-xs font-bold text-[#86EFAC]">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
            <span>معتمد للنشر — تمت مراجعة البيانات</span>
          </div>
        </div>

        {/* 4-Column Living Directory */}
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#C59B4E]">
              رؤية ريزيدنزا
            </span>
            <p className="text-xs leading-loose text-[#D5CFC4]">
              منصة عقارية فاخرة مكرّسة لمحافظة سوهاج ومدينة سوهاج الجديدة. نجمع بين التصميم العصري والشفافية المالية الكاملة لأسعار الكاش والتقسيط مع مراجعة كل إعلان قبل نشره.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-[#C59B4E]">
              استكشف العقارات
            </span>
            <ul className="space-y-2.5 text-xs text-[#D5CFC4]">
              <li>
                <Link href="/properties?transaction_type=sale" className="transition hover:text-white">
                  وحدات سكنية وفيلات للبيع
                </Link>
              </li>
              <li>
                <Link href="/properties?transaction_type=rent" className="transition hover:text-white">
                  وحدات ومقرات للإيجار
                </Link>
              </li>
              <li>
                <Link href="/properties?payment_method=cash_or_installment" className="transition hover:text-white">
                  عروض الكاش والتقسيط المرن
                </Link>
              </li>
              <li>
                <Link href="/categories" className="transition hover:text-white">
                  دليل التصنيفات العقارية
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-[#C59B4E]">
              أبرز وجهات سوهاج
            </span>
            <ul className="space-y-2.5 text-xs text-[#D5CFC4]">
              <li>
                <Link href="/locations" className="transition hover:text-white">
                  مدينة سوهاج (حي الشرق / حي الغرب)
                </Link>
              </li>
              <li>
                <Link href="/locations" className="transition hover:text-white">
                  مدينة سوهاج الجديدة (الكوامل)
                </Link>
              </li>
              <li>
                <Link href="/locations" className="transition hover:text-white">
                  حي الكوثر ومدينة أخميم
                </Link>
              </li>
              <li>
                <Link href="/locations" className="transition hover:text-white">
                  طهطا · جرجا · البلينا · المراغة
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-[#C59B4E]">
              خدمات الملاك والمعلنين
            </span>
            <ul className="space-y-2.5 text-xs text-[#D5CFC4]">
              <li>
                <Link href="/about" className="transition hover:text-white">
                  عن ريزيدنزا وميثاق المراجعة
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-white">
                  مكتب سوهاج والتواصل المباشر
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-white">
                  تسجيل دخول الأعضاء
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition hover:text-white">
                  انضم كمالك أو مسوق أو مطور عقاري
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Honest Verification Charter Notice (Rule D-11) */}
        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-white/[0.03] p-6 text-xs text-[#A39E93] lg:flex-row lg:items-center">
          <p className="max-w-3xl leading-relaxed">
            <strong className="text-[#E5C378]">تنويه الشفافية والاعتماد الإعلاني:</strong>{' '}
            عبارة «معتمد للنشر» أو «تمت مراجعة البيانات» تفيد بمراجعة إدارة منصة ريزيدنزا لاكتمال البيانات والصور والهيكل المالي المعلن قبل إتاحته للجمهور، ولا تُعد بديلاً عن الفحص القانوني الرسمي للملكية لدى الشهر العقاري عند التعاقد.
          </p>

          <p className="shrink-0 text-[11px] text-[#A39E93] tabular-nums-west">
            &copy; {currentYear} RESIDENZA SOHAG. جميع الحقوق محفوظة.
          </p>
        </div>
      </Container>
    </footer>
  );
}
