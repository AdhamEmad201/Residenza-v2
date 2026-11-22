'use client';

import React, { useEffect, useState } from 'react';
import { getPublicSiteConfig, submitBuyerRequest } from '@/lib/api/public';
import { ApiError } from '@/lib/api/client';

const DEFAULT_AREAS = [
  'سوهاج الجديدة',
  'الكوامل',
  'حي راشد',
  'حي الشرق',
  'حي الغرب',
  'حي الكوثر',
  'أخميم',
  'طهطا',
  'جرجا',
];

const PROPERTY_TYPES = [
  'شقة سكنية',
  'فيلا مستقلة / تاون هاوس',
  'مقر تجاري / محل',
  'مقر إداري / عيادة',
  'أرض سكنية أو استثمارية',
];

export function BuyerRequestBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [areas, setAreas] = useState<string[]>(DEFAULT_AREAS);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [area, setArea] = useState(DEFAULT_AREAS[0]);
  const [budgetMax, setBudgetMax] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAreas() {
      const cfg = await getPublicSiteConfig();
      if (!active || !cfg?.areas?.length) return;
      const names = cfg.areas.map((a) => a.name);
      setAreas(names);
      setArea(names[0]);
    }
    void loadAreas();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await submitBuyerRequest({
        name: name.trim(),
        phone: phone.trim(),
        property_type: propertyType,
        area,
        budget_max: budgetMax.trim() ? Number(budgetMax) : null,
        notes: notes.trim() || undefined,
      });
      setSuccessMsg(res.message || 'تم استلام طلبك العقاري بنجاح!');
      setName('');
      setPhone('');
      setBudgetMax('');
      setNotes('');
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : 'تعذر إرسال الطلب حالياً، يرجى المحاولة لاحقاً.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-l from-[#403E3D] to-[#2F2D2C] p-6 text-white shadow-ambient-lg sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <span className="inline-block rounded-full bg-[#9F7753]/30 px-3.5 py-1 text-xs font-bold text-[#CEB38F]">
              خدمة «اطلب عقارك» المجانية
            </span>
            <h3 className="text-xl font-extrabold text-white sm:text-2xl">
              لم تجد العقار المطابق لمواصفاتك وميزانيتك؟
            </h3>
            <p className="text-xs leading-relaxed text-[#F3EAD8]/85 sm:text-sm">
              سجّل مواصفات العقار المطلوب في سوهاج أو سوهاج الجديدة وسنوجه طلبك فوراً لأفضل شركات التطوير والوكلاء المعتمدين.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMsg(null);
              setErrorMsg(null);
              setIsOpen(true);
            }}
            className="shrink-0 cursor-pointer rounded-full bg-[#9F7753] px-7 py-3.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#8A6346]"
          >
            اطلب عقارك الآن &#8592;
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="نموذج اطلب عقارك"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-ambient-lg sm:p-8">
            <div className="flex items-center justify-between border-b border-[#403E3D]/10 pb-4">
              <div>
                <span className="text-xs font-bold text-[#9F7753]">خدمة المستشار العقاري</span>
                <h3 className="text-xl font-extrabold text-[#403E3D]">اطلب عقارك في سوهاج</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-full bg-[#FAF7F2] px-3 py-1.5 text-xs font-bold text-[#403E3D] hover:bg-[#F3EAD8]"
              >
                إغلاق ✕
              </button>
            </div>

            {successMsg ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F6EF] text-2xl text-[#136F48]">
                  ✓
                </div>
                <p className="text-base font-extrabold text-[#403E3D]">{successMsg}</p>
                <p className="text-xs text-[#5C5855]">
                  تم توجيه طلبك إلى غرفة التحكم ليقوم الشريك العقاري المختص بالتواصل معك.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-full bg-[#403E3D] px-6 py-2.5 text-xs font-bold text-white"
                >
                  حسناً
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {errorMsg && (
                  <div className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#403E3D]">الاسم بالكامل *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد محمود"
                      className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#403E3D]">
                      رقم الهاتف / واتساب *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                      className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#403E3D]">نوع العقار المطلوب *</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    >
                      {PROPERTY_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#403E3D]">المنطقة المفضلة *</label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                    >
                      {areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#403E3D]">
                    الميزانية القصوى التقريبية (ج.م - اختياري)
                  </label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="1500000"
                    className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#403E3D]">
                    مواصفات إضافية (المساحة، عدد الغرف، كاش أم تقسيط...)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب أي تفاصيل تساعدنا في ترشيح أنسب الوحدات لك..."
                    className="mt-1 w-full rounded-2xl border border-[#403E3D]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-medium text-[#403E3D] focus:border-[#9F7753] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer rounded-full bg-[#FAF7F2] px-5 py-2.5 text-xs font-bold text-[#403E3D]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer rounded-full bg-[#9F7753] px-7 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#8A6346] disabled:opacity-50"
                  >
                    {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الطلب الآن'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
