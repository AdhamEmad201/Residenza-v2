'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import type { AccountType } from '@/types/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type PublicAccountType = Exclude<AccountType, 'admin'>;

const ACTOR_OPTIONS: Array<{
  type: PublicAccountType;
  code: string;
  title: string;
  subtitle: string;
}> = [
  {
    type: 'individual',
    code: '01',
    title: 'مالك عقار (فرد)',
    subtitle: 'لأصحاب الوحدات الراغبين في طرح عقاراتهم مباشرة',
  },
  {
    type: 'broker',
    code: '02',
    title: 'وسيط عقاري (سمسار)',
    subtitle: 'للوسطاء والمكاتب العقارية العاملة في مدن ومراكز سوهاج',
  },
  {
    type: 'company',
    code: '03',
    title: 'شركة عقارية / مطور',
    subtitle: 'لشركات التطوير والاستثمار والمشروعات السكنية والتجارية',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [accountType, setAccountType] = useState<PublicAccountType>('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresCompanyName = accountType === 'broker' || accountType === 'company';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp_number: whatsappNumber.trim() ? whatsappNumber.trim() : null,
        account_type: accountType,
        company_name: requiresCompanyName ? companyName.trim() : null,
        password,
        password_confirmation: passwordConfirmation,
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.message);
        if (error.errors) {
          setFieldErrors(error.errors);
        }
      } else {
        setGeneralError('تعذر إتمام التسجيل حالياً. يرجى التحقق من البيانات والمحاولة مجدداً.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-20">
      <Container>
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-ambient-lg sm:p-11">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center">
              <Image
                src="/images/residenza-logo.svg"
                alt="RESIDENZA"
                width={154}
                height={38}
                priority
                className="h-9 w-auto"
              />
            </Link>
            <div className="mt-1">
              <span className="inline-block rounded-full bg-[#F3EAD8] px-4 py-1 text-xs font-bold text-[#8A6346]">
                انضم إلى مجتمع معلني ريزيدنزا سوهاج
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-[#403E3D] sm:text-4xl">
              إنشاء حساب معلن جديد
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5C5855]">
              حدد صفة الحساب بدقة لتظهر شارة المعلن الصحيحة على وحداتك المعتمدة في سوهاج.
            </p>
          </div>

          {generalError && (
            <div
              role="alert"
              className="mt-6 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
            >
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
            {/* Step 1: Multi-Actor Pill Card Selector (D-08) */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold text-[#403E3D]">
                اختر صفة الحساب <span className="text-[#9F7753]">*</span>
              </legend>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ACTOR_OPTIONS.map((option) => {
                  const isSelected = accountType === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => setAccountType(option.type)}
                      aria-pressed={isSelected}
                      className={`cursor-pointer rounded-2xl p-4 text-start transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#403E3D] text-white shadow-md scale-[1.01]'
                          : 'bg-[#FAF7F2] text-[#403E3D] hover:bg-[#F3EAD8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? 'bg-[#9F7753] text-white'
                              : 'bg-white text-[#8A6346]'
                          }`}
                        >
                          {option.code}
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isSelected ? 'bg-[#CEB38F]' : 'bg-transparent'
                          }`}
                        />
                      </div>
                      <p className="mt-3 text-xs font-extrabold">{option.title}</p>
                      <p
                        className={`mt-1 text-[11px] leading-relaxed ${
                          isSelected ? 'text-white/80' : 'text-[#5C5855]'
                        }`}
                      >
                        {option.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.account_type?.[0] && (
                <p className="text-xs font-semibold text-red-700">
                  {fieldErrors.account_type[0]}
                </p>
              )}
            </fieldset>

            {/* Conditional Company / Brokerage Name */}
            {requiresCompanyName && (
              <div className="rounded-2xl bg-[#F3EAD8]/65 p-5">
                <Input
                  label={
                    accountType === 'company'
                      ? 'اسم الشركة العقارية'
                      : 'اسم المكتب العقاري أو النشاط التجاري'
                  }
                  required
                  className="bg-white"
                  placeholder={
                    accountType === 'company'
                      ? 'مثال: شركة النخبة للتطوير العقاري بسوهاج'
                      : 'مثال: مكتب الأمانة للتسويق العقاري'
                  }
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  error={fieldErrors.company_name?.[0]}
                />
              </div>
            )}

            {/* Personal & Contact Info */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="الاسم الكامل للمسؤول"
                required
                placeholder="أدخل الاسم الثلاثي بالعربية"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name?.[0]}
              />

              <Input
                label="البريد الإلكتروني"
                type="email"
                required
                dir="ltr"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email?.[0]}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="رقم الهاتف المحمول (مصر)"
                required
                dir="ltr"
                placeholder="010xxxxxxxx"
                hint="يُشترط رقم هاتف مصري مكون من 11 رقماً"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors.phone?.[0]}
              />

              <Input
                label="رقم واتساب للتواصل (اختياري)"
                dir="ltr"
                placeholder="اتركه فارغاً لاستخدام رقم الهاتف نفسه"
                hint="سيتم اعتماد رقم الهاتف تلقائياً إذا تُرك فارغاً"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                error={fieldErrors.whatsapp_number?.[0]}
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="كلمة المرور"
                type="password"
                required
                dir="ltr"
                placeholder="8 أحرف على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password?.[0]}
              />

              <Input
                label="تأكيد كلمة المرور"
                type="password"
                required
                dir="ltr"
                placeholder="أعد كتابة كلمة المرور"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                error={fieldErrors.password_confirmation?.[0]}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="gold" size="lg" fullWidth isLoading={isSubmitting}>
                إنشاء الحساب الآن
              </Button>
            </div>
          </form>

          <div className="mt-8 rounded-2xl bg-[#FAF7F2] p-4 text-center text-xs text-[#5C5855]">
            <span>تمتلك عضوية مسجلة بالفعل؟</span>{' '}
            <Link
              href="/login"
              className="font-bold text-[#403E3D] underline-offset-4 hover:underline"
            >
              تسجيل الدخول الآن
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
