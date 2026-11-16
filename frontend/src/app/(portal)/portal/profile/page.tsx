'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { updatePortalProfile } from '@/lib/api/portal';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

export default function PortalProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setWhatsappNumber(user.whatsapp_number || '');
    setCompanyName(user.company_name || '');
  }, [user]);

  if (!user) {
    return null;
  }

  const requiresCompany =
    user.account_type === 'broker' || user.account_type === 'company';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessText(null);
    setErrorText(null);
    setFieldErrors({});
    setIsSaving(true);

    try {
      await updatePortalProfile({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_number: whatsappNumber.trim() ? whatsappNumber.trim() : null,
        company_name: requiresCompany ? companyName.trim() : null,
        current_password: currentPassword ? currentPassword : null,
        password: newPassword ? newPassword : null,
        password_confirmation: passwordConfirmation ? passwordConfirmation : null,
      });

      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');
      setSuccessText('تم تحديث بيانات الملف الشخصي بنجاح.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorText(error.message);
        if (error.errors) {
          setFieldErrors(error.errors);
        }
      } else {
        setErrorText('حدث خطأ أثناء تحديث الملف الشخصي.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-3xl bg-white p-7 shadow-ambient sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-[#F7EFE0] px-3.5 py-1 text-xs font-bold text-[#8E6722]">
              {ACCOUNT_TYPE_LABELS[user.account_type]}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-[#131E26]">
              إعدادات الحساب والملف الشخصي
            </h2>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] px-4 py-2 text-xs text-[#78828A]">
            البريد المسجل: <strong className="font-mono text-[#131E26]">{user.email}</strong>
          </div>
        </div>

        {successText && (
          <div
            role="status"
            className="mt-6 rounded-2xl bg-[#E8F6EF] p-4 text-xs font-bold text-[#136F48]"
          >
            {successText}
          </div>
        )}

        {errorText && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
          >
            {errorText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="الاسم الكامل"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name?.[0]}
            />

            <Input
              label="رقم الهاتف المصري"
              required
              dir="ltr"
              placeholder="010xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={fieldErrors.phone?.[0]}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="رقم واتساب للتواصل"
              dir="ltr"
              placeholder="010xxxxxxxx"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              error={fieldErrors.whatsapp_number?.[0]}
            />

            {requiresCompany && (
              <Input
                label={
                  user.account_type === 'company'
                    ? 'اسم الشركة العقارية'
                    : 'اسم المكتب العقاري'
                }
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={fieldErrors.company_name?.[0]}
              />
            )}
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] p-5 space-y-4">
            <div>
              <span className="text-xs font-bold text-[#C59B4E]">تحديث كلمة المرور</span>
              <p className="text-xs text-[#78828A]">
                اترك حقول كلمة المرور فارغة إذا لم ترغب في تغييرها.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                type="password"
                dir="ltr"
                className="bg-white"
                label="كلمة المرور الحالية"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={fieldErrors.current_password?.[0]}
              />

              <Input
                type="password"
                dir="ltr"
                className="bg-white"
                label="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={fieldErrors.password?.[0]}
              />

              <Input
                type="password"
                dir="ltr"
                className="bg-white"
                label="تأكيد كلمة المرور الجديدة"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                error={fieldErrors.password_confirmation?.[0]}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="gold" size="lg" isLoading={isSaving}>
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
