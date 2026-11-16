import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'عن ريزيدنزا | الشفافية والفخامة العقارية في سوهاج',
  description:
    'تعرف على رؤية منصة ريزيدنزا العقارية في محافظة سوهاج ومعايير مراجعة واعتماد الإعلانات العقارية وفصل أسعار الكاش والتقسيط.',
};

export default function AboutPage() {
  return (
    <div className="py-12 lg:py-20 space-y-12">
      <Container>
        {/* Warm Luxury Hero Card */}
        <header className="rounded-3xl bg-[#F3EDE2] p-8 sm:p-14">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-bold text-[#A67C33] shadow-2xs">
            رؤية ريزيدنزا · محافظة سوهاج
          </span>
          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-[1.2] tracking-tight text-[#131E26] sm:text-5xl">
            ريزيدنزا: أسلوب حياة عقاري يجمع الفخامة بالشفافية المالية في سوهاج
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-loose text-[#4A555E] sm:text-lg">
            تأسست منصة ريزيدنزا (RESIDENZA) لتكون الوجهة العقارية المرجعية المعتمدة لأبناء محافظة سوهاج والمستثمرين في مدينة سوهاج الجديدة وكافة مراكز المحافظة، بعيداً عن العشوائية الإعلانية أو غموض شروط السداد.
          </p>
        </header>

        {/* 3 Sculptural Pillars */}
        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 shadow-ambient">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7EFE0] text-sm font-extrabold text-[#A67C33]">
              01
            </span>
            <h2 className="mt-5 text-2xl font-bold text-[#131E26]">
              تغطية شاملة لـ 38 منطقة في سوهاج
            </h2>
            <p className="mt-3 text-sm leading-loose text-[#4A555E]">
              يغطي الدليل الجغرافي للمنصة 38 نطاقاً إدارياً وعمرانياً يشمل أحياء مدينة سوهاج (الشرق، الغرب، مدينة ناصر)، مدينة سوهاج الجديدة (الكوامل)، حي الكوثر، وجميع المراكز من طما وطهطا شمالاً حتى جرجا والبلينا ودار السلام جنوباً.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-ambient">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7EFE0] text-sm font-extrabold text-[#A67C33]">
              02
            </span>
            <h2 className="mt-5 text-2xl font-bold text-[#131E26]">
              فصل صريح بين الكاش والتقسيط
            </h2>
            <p className="mt-3 text-sm leading-loose text-[#4A555E]">
              تُلزم ريزيدنزا كل معلن بتحديد سعر البيع الكاش الفوري وسعر التقسيط الإجمالي كلٍ على حدة، مع إيضاح قيمة مقدم التعاقد (أو بدون مقدم 0 ج.م) وعدد أشهر التقسيط بدقة تامة.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-ambient">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7EFE0] text-sm font-extrabold text-[#A67C33]">
              03
            </span>
            <h2 className="mt-5 text-2xl font-bold text-[#131E26]">
              مراجعة البيانات والصور قبل النشر
            </h2>
            <p className="mt-3 text-sm leading-loose text-[#4A555E]">
              يمر كل إعلان جديد أو تعديل جوهري على وحدة منشورة عبر بوابة التدقيق والمراجعة الإدارية للتحقق من اتساق المواصفات والصور قبل منحه شارة الاعتماد الإعلاني.
            </p>
          </div>
        </section>

        {/* Honest Verification Charter (D-11) */}
        <section className="bg-nile-luxury mt-12 rounded-3xl p-8 text-white shadow-ambient-lg sm:p-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="inline-block rounded-full bg-[#C59B4E]/20 px-4 py-1 text-xs font-bold text-[#E5C378]">
                ميثاق الشفافية · D-11
              </span>
              <h2 className="mt-4 text-2xl font-extrabold leading-snug text-white">
                دلالة شارة «معتمد للنشر — تمت مراجعة البيانات»
              </h2>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#E8F6EF]/15 px-4 py-2 text-xs font-bold text-[#86EFAC]">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                معتمد للنشر
              </span>
            </div>

            <div className="space-y-4 text-sm leading-loose text-white/85 lg:col-span-8">
              <p className="font-bold text-white">
                تلتزم ريزيدنزا بأعلى معايير الأمانة المهنية في عرض البيانات العقارية، وتوضح للمتعاملين الضوابط الآتية:
              </p>
              <ul className="list-disc space-y-2.5 ps-5">
                <li>
                  شارة <strong className="text-[#E5C378]">«معتمد للنشر»</strong> أو{' '}
                  <strong className="text-[#E5C378]">«تمت مراجعة البيانات»</strong> تعني أن فريق المراجعة قد فحص استيفاء الإعلان للبيانات الأساسية والصور والأسعار المعلنة من قِبل صاحب الحساب قبل إتاحته للجمهور.
                </li>
                <li>
                  المرفقات والوثائق الثبوتية التي يرفعها المعلن لأغراض الفحص الإداري تُحفظ في خزينة رقمية خاصة ومعزولة تماماً عن الشبكة العامة حفاظاً على سرية بيانات الملاك والوسطاء.
                </li>
                <li>
                  الاعتماد الإعلاني للبيانات لا يُغني بأي حال عن قيام المشتري أو المستأجر بالمعاينة الميدانية ومراجعة مستندات الملكية الرسمية وتسلسلها القانوني لدى الشهر العقاري أو عبر مستشار قانوني مختص قبل التعاقد.
                </li>
              </ul>

              <div className="flex flex-wrap gap-3.5 pt-4">
                <Link
                  href="/properties"
                  className="rounded-full bg-[#C59B4E] px-7 py-3.5 text-xs font-bold tracking-wide text-white shadow-md transition hover:bg-[#A67C33]"
                >
                  تصفح العقارات المعتمدة
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-white/15 px-7 py-3.5 text-xs font-bold tracking-wide text-white transition hover:bg-white/25"
                >
                  انضم كمالك أو وسيط عقاري
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
