'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawRedirect = searchParams.get('redirect');
  const safeRedirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      router.push(safeRedirect);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.message);
        if (error.errors) {
          setFieldErrors(error.errors);
        }
      } else {
        setGeneralError('حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-ambient-lg sm:p-10">
      <div>
        <span className="inline-block rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#A67C33]">
          بوابة الأعضاء والمعلنين
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-[#131E26] sm:text-3xl">
          تسجيل الدخول إلى ريزيدنزا
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#4A555E]">
          أدخل بيانات حسابك لإدارة وحداتك العقارية ومتابعة حالة الاعتماد.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="mt-5 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <Input
          label="البريد الإلكتروني"
          type="email"
          name="email"
          autoComplete="email"
          required
          dir="ltr"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email?.[0]}
        />

        <Input
          label="كلمة المرور"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          dir="ltr"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password?.[0]}
        />

        <div className="pt-2">
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
            الدخول إلى الحساب
          </Button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl bg-[#FAF7F2] p-4 text-center text-xs text-[#4A555E]">
        <span>ليس لديك حساب معلن بعد؟</span>{' '}
        <Link
          href="/register"
          className="font-bold text-[#A67C33] underline-offset-4 hover:underline"
        >
          إنشاء حساب جديد (مالك / وسيط / شركة)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="py-14 lg:py-24">
      <Container>
        <Suspense
          fallback={
            <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center text-xs text-[#78828A] shadow-ambient">
              جارٍ تهيئة بوابة الدخول...
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </Container>
    </div>
  );
}
