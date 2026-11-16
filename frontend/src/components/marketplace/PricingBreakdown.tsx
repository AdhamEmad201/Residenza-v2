import React from 'react';
import type { PublicProperty } from '@/types/api';
import { formatPriceEgp } from '@/lib/utils/format';
import {
  PAYMENT_METHOD_LABELS,
  RENTAL_PERIOD_LABELS,
  TRANSACTION_LABELS,
} from '@/lib/api/public';

export interface PricingBreakdownProps {
  property: PublicProperty;
}

export function PricingBreakdown({ property }: PricingBreakdownProps) {
  const isRent = property.transaction_type === 'rent';
  const isDualSale =
    !isRent &&
    property.payment_method === 'cash_or_installment' &&
    Boolean(property.installment_price_egp);
  const isInstallmentSupported =
    !isRent &&
    (property.payment_method === 'installment' ||
      property.payment_method === 'cash_or_installment');

  const downPaymentValue =
    property.down_payment_egp !== null && property.down_payment_egp !== undefined
      ? parseFloat(property.down_payment_egp)
      : null;

  const totalInstallmentBase = property.installment_price_egp
    ? parseFloat(property.installment_price_egp)
    : parseFloat(property.price_egp);

  const estimatedMonthly =
    isInstallmentSupported &&
    property.installment_period_months &&
    property.installment_period_months > 0 &&
    !isNaN(totalInstallmentBase)
      ? Math.max(
          0,
          (totalInstallmentBase - (downPaymentValue && downPaymentValue > 0 ? downPaymentValue : 0)) /
            property.installment_period_months
        )
      : null;

  return (
    <section
      aria-label="البيان المالي وخيارات السداد"
      className="rounded-3xl bg-white p-7 shadow-ambient"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">
            الشفافية المالية الكاملة
          </span>
          <h2 className="mt-1 text-xl font-bold text-[#131E26]">
            تفاصيل السعر وخطة السداد
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-[#131E26] px-4 py-1.5 text-white">
            {TRANSACTION_LABELS[property.transaction_type]}
          </span>
          {property.payment_method && (
            <span className="rounded-full bg-[#F7EFE0] px-4 py-1.5 text-[#8E6722]">
              {PAYMENT_METHOD_LABELS[property.payment_method]}
            </span>
          )}
        </div>
      </div>

      {/* Primary Financial Panels */}
      {isRent ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#FAF7F2] p-5">
            <span className="text-xs font-bold text-[#78828A]">القيمة الإيجارية</span>
            <p className="mt-2 text-3xl font-extrabold text-[#131E26] tabular-nums-west">
              {formatPriceEgp(property.price_egp)}
              {property.rental_period && (
                <span className="ms-2 text-xs font-bold text-[#A67C33]">
                  ({RENTAL_PERIOD_LABELS[property.rental_period]})
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] p-5">
            <span className="text-xs font-bold text-[#78828A]">مبلغ التأمين</span>
            <p className="mt-2 text-2xl font-bold text-[#131E26] tabular-nums-west">
              {property.insurance_deposit_egp !== null &&
              property.insurance_deposit_egp !== undefined
                ? parseFloat(property.insurance_deposit_egp) === 0
                  ? 'بدون تأمين (0 ج.م)'
                  : formatPriceEgp(property.insurance_deposit_egp)
                : 'يُحدد عند التعاقد'}
            </p>
          </div>
        </div>
      ) : isDualSale && property.installment_price_egp ? (
        /* UD-02 = B: Separate Cash & Installment Pricing Cards */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#FAF7F2] p-6">
            <span className="inline-block rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#131E26] shadow-2xs">
              سعر الدفع الكاش (النقدي الفوري)
            </span>
            <p className="mt-3 text-3xl font-extrabold text-[#131E26] tabular-nums-west">
              {formatPriceEgp(property.price_egp)}
            </p>
            <p className="mt-1.5 text-xs text-[#78828A]">
              القيمة النهائية في حال السداد النقدي الكامل عند التعاقد
            </p>
          </div>

          <div className="rounded-2xl bg-[#F7EFE0]/75 p-6">
            <span className="inline-block rounded-full bg-[#C59B4E] px-3 py-1 text-[11px] font-bold text-white">
              إجمالي السعر بالتقسيط
            </span>
            <p className="mt-3 text-3xl font-extrabold text-[#A67C33] tabular-nums-west">
              {formatPriceEgp(property.installment_price_egp)}
            </p>
            <p className="mt-1.5 text-xs text-[#8E6722]">
              إجمالي قيمة الوحدة شاملة جدول تسهيلات السداد
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#FAF7F2] p-6">
          <span className="text-xs font-bold text-[#78828A]">
            {property.payment_method === 'installment'
              ? 'إجمالي سعر الوحدة بالتقسيط'
              : 'سعر البيع المطلوب'}
          </span>
          <p className="mt-2 text-3xl font-extrabold text-[#131E26] tabular-nums-west">
            {formatPriceEgp(property.price_egp)}
          </p>
        </div>
      )}

      {/* Installment Schedule Breakdown (OD-05 = A) */}
      {isInstallmentSupported && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 tabular-nums-west">
          <div className="rounded-2xl bg-[#FAF7F2] p-4">
            <span className="block text-[11px] font-bold text-[#78828A]">مقدم التعاقد</span>
            <span className="mt-1 block text-base font-extrabold text-[#131E26]">
              {downPaymentValue === null
                ? 'غير محدد (بالاتفاق)'
                : downPaymentValue === 0
                  ? 'بدون مقدم (0 ج.م)'
                  : formatPriceEgp(downPaymentValue)}
            </span>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] p-4">
            <span className="block text-[11px] font-bold text-[#78828A]">فترة التقسيط</span>
            <span className="mt-1 block text-base font-extrabold text-[#131E26]">
              {property.installment_period_months
                ? `${property.installment_period_months} شهر (${(
                    property.installment_period_months / 12
                  ).toFixed(1).replace(/\.0$/, '')} سنة)`
                : 'تُحدد بالاتفاق'}
            </span>
          </div>

          <div className="rounded-2xl bg-[#F7EFE0]/70 p-4">
            <span className="block text-[11px] font-bold text-[#8E6722]">
              القسط الشهري التقديري
            </span>
            <span className="mt-1 block text-base font-extrabold text-[#A67C33]">
              {estimatedMonthly !== null
                ? `${formatPriceEgp(Math.round(estimatedMonthly))} / شهرياً`
                : 'حسب جدول الدفعات'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
