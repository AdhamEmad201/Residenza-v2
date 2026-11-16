'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function ContactPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('general');
  const [referenceCode, setReferenceCode] = useState('');
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (fullName.trim().length < 3) {
      setErrorText('يرجى إدخال الاسم الكامل بشكل صحيح.');
      return;
    }

    const egyptPhonePattern = /^(?:\+?20|0)?1[0125]\d{8}$/;
    if (!egyptPhonePattern.test(phone.trim())) {
      setErrorText('يرجى إدخال رقم هاتف مصري صحيح (مثال: 010xxxxxxxx).');
      return;
    }

    if (message.trim().length < 10) {
      setErrorText('يرجى كتابة تفاصيل الاستفسار أو الرسالة (10 أحرف على الأقل).');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="py-12 lg:py-20">
      <Container>
        <header className="mb-12 rounded-3xl bg-[#F3EDE2] p-8 sm:p-12">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-bold text-[#A67C33] shadow-2xs">
            مكتب سوهاج الإقليمي · تواصل مباشر
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#131E26] sm:text-5xl">
            نسعد بخدمتكم في محافظة سوهاج
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4A555E]">
            يستقبل فريق ريزيدنزا في محافظة سوهاج استفسارات الملاك، الوسطاء العقاريين المعتمدين، وشركات التطوير العقاري، بالإضافة إلى طلبات المراجعة والدعم الفني.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Office Info Cards Column */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-3xl bg-white p-6 shadow-ambient space-y-5">
              <div className="rounded-2xl bg-[#FAF7F2] p-4">
                <span className="text-xs font-bold text-[#A67C33]">
                  المقر الإقليمي
                </span>
                <p className="mt-1 text-sm font-bold text-[#131E26]">
                  محافظة سوهاج — مدينة سوهاج، حي الشرق، شارع الجمهورية
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F2] p-4">
                <span className="text-xs font-bold text-[#A67C33]">
                  مواعيد العمل الرسمية
                </span>
                <p className="mt-1 text-sm font-bold text-[#131E26] tabular-nums-west">
                  السبت إلى الخميس — 10:00 صباحاً حتى 8:00 مساءً
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F2] p-4">
                <span className="text-xs font-bold text-[#A67C33]">
                  البريد الإلكتروني
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-[#131E26]">
                  support@residenza.eg
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F2] p-4">
                <span className="text-xs font-bold text-[#A67C33]">
                  الهاتف المباشر وواتساب
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-[#131E26] tabular-nums-west" dir="ltr">
                  +20 100 000 0000
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-[#F7EFE0] p-6 text-xs leading-relaxed text-[#8E6722]">
              <strong className="text-[#131E26]">ملاحظة للمشترين والمستأجرين:</strong>{' '}
              للاستفسار عن وحدة عقارية محددة، يُرجى فتح صفحة العقار واستخدام زر «تواصل عبر واتساب الآن» مع الإشارة إلى الكود المرجعي (`RES-2026-xxxxx`).
            </div>
          </div>

          {/* Validated Inquiry Form Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white p-7 shadow-ambient-lg sm:p-10">
              <span className="text-xs font-bold text-[#C59B4E]">
                مراسلة فورية
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-[#131E26]">
                نموذج التواصل والدعم
              </h2>

              {submitted ? (
                <div
                  role="status"
                  className="mt-6 rounded-2xl bg-[#E8F6EF] p-6 text-start"
                >
                  <span className="inline-block rounded-full bg-[#136F48] px-3 py-1 text-[11px] font-bold text-white">
                    تم الإرسال بنجاح ✓
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-[#131E26]">
                    تم استلام رسالتك بنجاح، {fullName}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A555E]">
                    سيتواصل معك فريق دعم ريزيدنزا سوهاج عبر الرقم{' '}
                    <span className="font-mono font-bold text-[#131E26]" dir="ltr">
                      {phone}
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setMessage('');
                      setReferenceCode('');
                    }}
                    className="mt-5 cursor-pointer rounded-full bg-[#131E26] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#1E2E3A]"
                  >
                    إرسال رسالة جديدة
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  {errorText && (
                    <div
                      role="alert"
                      className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
                    >
                      {errorText}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="الاسم الكامل"
                      required
                      placeholder="أدخل اسمك الثلاثي"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />

                    <Input
                      label="رقم الهاتف / واتساب"
                      required
                      dir="ltr"
                      placeholder="010xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Select
                      label="موضوع المراسلة"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      options={[
                        { value: 'general', label: 'استفسار عام عن المنصة' },
                        { value: 'listing_help', label: 'مساعدة في إدراج أو اعتماد عقار' },
                        { value: 'company_onboarding', label: 'اعتماد شركة تطوير أو مكتب وساطة' },
                        { value: 'report_listing', label: 'ملاحظة حول إعلان منشور' },
                      ]}
                    />

                    <Input
                      label="الكود المرجعي للعقار (اختياري)"
                      placeholder="RES-2026-00001"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 text-start">
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-bold text-[#131E26]"
                    >
                      تفاصيل الرسالة <span className="ms-1 text-[#C59B4E]">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      required
                      placeholder="اكتب استفسارك أو ملاحظتك بالتفصيل..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-2xl bg-[#FAF7F2] p-4 text-sm text-[#131E26] ring-1 ring-[#131E26]/10 placeholder:text-[#78828A] transition-all focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="gold" size="lg">
                      إرسال المراسلة
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
