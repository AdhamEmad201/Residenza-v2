'use client';

import React, { useState } from 'react';
import type {
  Category,
  FacadeType,
  FinishingType,
  LegalStatus,
  Location,
  PaymentMethod,
  PortalProperty,
  RentalPeriod,
  TransactionType,
} from '@/types/api';
import type { PortalPropertyPayload } from '@/lib/api/portal';
import {
  FACADE_TYPE_LABELS,
  FINISHING_TYPE_LABELS,
  LEGAL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  RENTAL_PERIOD_LABELS,
  TRANSACTION_LABELS,
} from '@/lib/api/public';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

export interface PropertyFormProps {
  mode: 'portal-create' | 'portal-edit' | 'admin-create' | 'admin-edit';
  categories: Category[];
  locations: Location[];
  initialData?: Partial<PortalProperty>;
  defaultPhone?: string;
  defaultWhatsapp?: string;
  onSubmit: (payload: PortalPropertyPayload) => Promise<void>;
}

function flattenCategories(categories: Category[]): SelectOption[] {
  const opts: SelectOption[] = [];
  for (const cat of categories) {
    opts.push({ value: cat.id, label: cat.name_ar });
    if (cat.children && cat.children.length > 0) {
      for (const sub of cat.children) {
        opts.push({ value: sub.id, label: `— ${sub.name_ar}` });
      }
    }
  }
  return opts;
}

function flattenLocations(locations: Location[], depth = 0): SelectOption[] {
  const opts: SelectOption[] = [];
  const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
  for (const loc of locations) {
    opts.push({ value: loc.id, label: `${prefix}${loc.name_ar}` });
    if (loc.children && loc.children.length > 0) {
      opts.push(...flattenLocations(loc.children, depth + 1));
    }
  }
  return opts;
}

export function PropertyForm({
  mode,
  categories,
  locations,
  initialData,
  defaultPhone = '',
  defaultWhatsapp = '',
  onSubmit,
}: PropertyFormProps) {
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.category_id ? String(initialData.category_id) : ''
  );
  const [locationId, setLocationId] = useState<string>(
    initialData?.location_id ? String(initialData.location_id) : ''
  );
  const [transactionType, setTransactionType] = useState<TransactionType>(
    initialData?.transaction_type || 'sale'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialData?.payment_method || 'cash'
  );
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>(
    initialData?.rental_period || 'monthly'
  );
  const [titleAr, setTitleAr] = useState<string>(initialData?.title_ar || '');
  const [descriptionAr, setDescriptionAr] = useState<string>(
    initialData?.description_ar || ''
  );
  const [priceEgp, setPriceEgp] = useState<string>(
    initialData?.price_egp !== undefined && initialData?.price_egp !== null
      ? String(initialData.price_egp)
      : ''
  );
  const [installmentPriceEgp, setInstallmentPriceEgp] = useState<string>(
    initialData?.installment_price_egp ? String(initialData.installment_price_egp) : ''
  );
  const [downPaymentEgp, setDownPaymentEgp] = useState<string>(
    initialData?.down_payment_egp !== undefined && initialData?.down_payment_egp !== null
      ? String(initialData.down_payment_egp)
      : ''
  );
  const [installmentPeriodMonths, setInstallmentPeriodMonths] = useState<string>(
    initialData?.installment_period_months
      ? String(initialData.installment_period_months)
      : ''
  );
  const [insuranceDepositEgp, setInsuranceDepositEgp] = useState<string>(
    initialData?.insurance_deposit_egp !== undefined &&
      initialData?.insurance_deposit_egp !== null
      ? String(initialData.insurance_deposit_egp)
      : ''
  );
  const [areaSqm, setAreaSqm] = useState<string>(
    initialData?.area_sqm !== undefined && initialData?.area_sqm !== null
      ? String(initialData.area_sqm)
      : ''
  );
  const [bedrooms, setBedrooms] = useState<string>(
    initialData?.bedrooms !== undefined && initialData?.bedrooms !== null
      ? String(initialData.bedrooms)
      : ''
  );
  const [bathrooms, setBathrooms] = useState<string>(
    initialData?.bathrooms !== undefined && initialData?.bathrooms !== null
      ? String(initialData.bathrooms)
      : ''
  );
  const [floorLevel, setFloorLevel] = useState<string>(
    initialData?.floor_level !== undefined && initialData?.floor_level !== null
      ? String(initialData.floor_level)
      : ''
  );
  const [totalFloors, setTotalFloors] = useState<string>(
    initialData?.total_floors !== undefined && initialData?.total_floors !== null
      ? String(initialData.total_floors)
      : ''
  );
  const [finishingType, setFinishingType] = useState<FinishingType | ''>(
    initialData?.finishing_type || ''
  );
  const [buildingYear, setBuildingYear] = useState<string>(
    initialData?.building_year ? String(initialData.building_year) : ''
  );
  const [streetWidthMeters, setStreetWidthMeters] = useState<string>(
    initialData?.street_width_meters ? String(initialData.street_width_meters) : ''
  );
  const [facadeType, setFacadeType] = useState<FacadeType | ''>(
    initialData?.facade_type || ''
  );
  const [declaredLegalStatus, setDeclaredLegalStatus] = useState<LegalStatus | ''>(
    initialData?.declared_legal_status || ''
  );
  const [hasElevator, setHasElevator] = useState<boolean>(
    Boolean(initialData?.has_elevator)
  );
  const [hasElectricityMeter, setHasElectricityMeter] = useState<boolean>(
    Boolean(initialData?.has_electricity_meter)
  );
  const [hasWaterMeter, setHasWaterMeter] = useState<boolean>(
    Boolean(initialData?.has_water_meter)
  );
  const [hasNaturalGas, setHasNaturalGas] = useState<boolean>(
    Boolean(initialData?.has_natural_gas)
  );
  const [addressDetailsAr, setAddressDetailsAr] = useState<string>(
    initialData?.address_details_ar || ''
  );
  const [contactPhone, setContactPhone] = useState<string>(
    initialData?.contact_phone || defaultPhone
  );
  const [contactWhatsapp, setContactWhatsapp] = useState<string>(
    initialData?.contact_whatsapp || defaultWhatsapp || defaultPhone
  );

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const categoryOptions = flattenCategories(categories);
  const locationOptions = flattenLocations(locations);

  const isSale = transactionType === 'sale';
  const isRent = transactionType === 'rent';
  const isInstallmentOnly = isSale && paymentMethod === 'installment';
  const isDualSale = isSale && paymentMethod === 'cash_or_installment';
  const supportsInstallmentSchedule = isInstallmentOnly || isDualSale;

  const validateAndDispatch = async (shouldSubmitForReview: boolean) => {
    setGeneralError(null);
    setFieldErrors({});

    const numPrice = parseFloat(priceEgp);
    const numInstPrice = installmentPriceEgp ? parseFloat(installmentPriceEgp) : null;
    const numDownPayment = downPaymentEgp !== '' ? parseFloat(downPaymentEgp) : null;
    const numMonths = installmentPeriodMonths ? parseInt(installmentPeriodMonths, 10) : null;

    if (!categoryId || !locationId) {
      setGeneralError('يرجى اختيار التصنيف العقاري والمنطقة الجغرافية في سوهاج.');
      return;
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      setGeneralError('يرجى إدخال السعر الأساسي بقيمة أكبر من صفر.');
      return;
    }

    if (isSale) {
      if (isDualSale) {
        if (numInstPrice === null || isNaN(numInstPrice) || numInstPrice <= 0) {
          setGeneralError(
            'عند اختيار (كاش أو تقسيط) يجب إدخال إجمالي سعر التقسيط بقيمة أكبر من صفر (UD-02 = B).'
          );
          return;
        }
        if (
          numDownPayment !== null &&
          (numDownPayment < 0 || numDownPayment >= numInstPrice)
        ) {
          setGeneralError(
            'مقدم التعاقد يجب أن يكون أكبر من أو يساوي 0 وأقل من إجمالي سعر التقسيط (OD-05 = A).'
          );
          return;
        }
      } else if (isInstallmentOnly) {
        if (!numMonths || numMonths < 1) {
          setGeneralError('يرجى تحديد مدة التقسيط بالأشهر لعقارات البيع بالتقسيط.');
          return;
        }
        if (numDownPayment !== null && (numDownPayment < 0 || numDownPayment >= numPrice)) {
          setGeneralError(
            'مقدم التعاقد يجب أن يكون أكبر من أو يساوي 0 وأقل من إجمالي السعر (OD-05 = A).'
          );
          return;
        }
      }
    }

    const payload: PortalPropertyPayload = {
      submit: shouldSubmitForReview,
      category_id: Number(categoryId),
      location_id: Number(locationId),
      transaction_type: transactionType,
      payment_method: isSale ? paymentMethod : null,
      rental_period: isRent ? rentalPeriod : null,
      title_ar: titleAr.trim(),
      description_ar: descriptionAr.trim(),
      price_egp: numPrice,
      installment_price_egp: isDualSale && numInstPrice !== null ? numInstPrice : null,
      down_payment_egp:
        supportsInstallmentSchedule && numDownPayment !== null ? numDownPayment : null,
      installment_period_months:
        supportsInstallmentSchedule && numMonths !== null ? numMonths : null,
      insurance_deposit_egp:
        isRent && insuranceDepositEgp !== '' ? parseFloat(insuranceDepositEgp) : null,
      area_sqm: parseFloat(areaSqm),
      bedrooms: bedrooms !== '' ? parseInt(bedrooms, 10) : null,
      bathrooms: bathrooms !== '' ? parseInt(bathrooms, 10) : null,
      floor_level: floorLevel !== '' ? parseInt(floorLevel, 10) : null,
      total_floors: totalFloors !== '' ? parseInt(totalFloors, 10) : null,
      finishing_type: finishingType || null,
      building_year: buildingYear !== '' ? parseInt(buildingYear, 10) : null,
      street_width_meters:
        streetWidthMeters !== '' ? parseFloat(streetWidthMeters) : null,
      facade_type: facadeType || null,
      declared_legal_status: declaredLegalStatus || null,
      has_elevator: hasElevator,
      has_electricity_meter: hasElectricityMeter,
      has_water_meter: hasWaterMeter,
      has_natural_gas: hasNaturalGas,
      address_details_ar: addressDetailsAr.trim(),
      contact_phone: contactPhone.trim() || undefined,
      contact_whatsapp: contactWhatsapp.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.message);
        if (error.errors) {
          setFieldErrors(error.errors);
        }
      } else {
        setGeneralError('تعذر حفظ بيانات العقار. يرجى مراجعة الحقول والمحاولة مجدداً.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void validateAndDispatch(true);
      }}
      className="rounded-3xl bg-white p-6 shadow-ambient sm:p-9 space-y-8"
      noValidate
    >
      {generalError && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          {generalError}
        </div>
      )}

      {/* Section 1: Classification & Geography */}
      <div className="space-y-5">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">01 · التصنيف والموقع</span>
          <h3 className="text-lg font-extrabold text-[#131E26]">
            بيانات التصنيف العقاري والنطاق الجغرافي في سوهاج
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="التصنيف العقاري"
            required
            placeholderOption="اختر التصنيف العقاري"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
            error={fieldErrors.category_id?.[0]}
          />

          <Select
            label="المدينة / المركز / الحي في سوهاج"
            required
            placeholderOption="اختر الموقع داخل محافظة سوهاج"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            options={locationOptions}
            error={fieldErrors.location_id?.[0]}
          />
        </div>

        <Input
          label="عنوان العقار باللغة العربية"
          required
          placeholder="مثال: شقة فاخرة بإطلالة مفتوحة في مدينة سوهاج الجديدة"
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          error={fieldErrors.title_ar?.[0]}
        />

        <Input
          label="العنوان التفصيلي وعلامات الاستدلال"
          required
          placeholder="مثال: مدينة سوهاج الجديدة — الحي الأول — بجوار الجامعة"
          value={addressDetailsAr}
          onChange={(e) => setAddressDetailsAr(e.target.value)}
          error={fieldErrors.address_details_ar?.[0]}
        />
      </div>

      {/* Section 2: Financial Structure (UD-02 = B & OD-05 = A) */}
      <div className="rounded-3xl bg-[#FAF7F2] p-6 space-y-5">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">
            02 · الهيكلة المالية والشفافية (UD-02 = B &amp; OD-05 = A)
          </span>
          <h3 className="text-lg font-extrabold text-[#131E26]">
            نوع العرض، السعر، وشروط السداد
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="نوع المعاملة"
            required
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            options={Object.entries(TRANSACTION_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            error={fieldErrors.transaction_type?.[0]}
          />

          {isSale ? (
            <Select
              label="طريقة السداد المتاحة"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              error={fieldErrors.payment_method?.[0]}
            />
          ) : (
            <Select
              label="دورية الإيجار"
              required
              value={rentalPeriod}
              onChange={(e) => setRentalPeriod(e.target.value as RentalPeriod)}
              options={Object.entries(RENTAL_PERIOD_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              error={fieldErrors.rental_period?.[0]}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            type="number"
            min={1}
            step="0.01"
            required
            className="bg-white"
            label={
              isRent
                ? 'القيمة الإيجارية (ج.م)'
                : isInstallmentOnly
                  ? 'إجمالي سعر البيع بالتقسيط (ج.م)'
                  : 'سعر البيع النقدي / الكاش (ج.م)'
            }
            placeholder="مثال: 2500000"
            suffix="ج.م"
            value={priceEgp}
            onChange={(e) => setPriceEgp(e.target.value)}
            error={fieldErrors.price_egp?.[0]}
          />

          {isDualSale && (
            <Input
              type="number"
              min={1}
              step="0.01"
              required
              className="bg-white"
              label="إجمالي سعر البيع بالتقسيط (ج.م) — إلزامي"
              placeholder="مثال: 2950000"
              suffix="ج.م"
              hint="يُعرض منفصلاً بجانب سعر الكاش"
              value={installmentPriceEgp}
              onChange={(e) => setInstallmentPriceEgp(e.target.value)}
              error={fieldErrors.installment_price_egp?.[0]}
            />
          )}

          {isRent && (
            <Input
              type="number"
              min={0}
              step="0.01"
              className="bg-white"
              label="مبلغ التأمين (ج.م — اختياري، يقبل 0)"
              placeholder="مثال: 20000"
              suffix="ج.م"
              value={insuranceDepositEgp}
              onChange={(e) => setInsuranceDepositEgp(e.target.value)}
              error={fieldErrors.insurance_deposit_egp?.[0]}
            />
          )}
        </div>

        {supportsInstallmentSchedule && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              className="bg-white"
              label="مقدم التعاقد (ج.م — اختياري، يقبل 0 بدون مقدم)"
              placeholder="مثال: 350000 أو 0"
              suffix="ج.م"
              hint="يجب أن يكون أقل من إجمالي سعر التقسيط"
              value={downPaymentEgp}
              onChange={(e) => setDownPaymentEgp(e.target.value)}
              error={fieldErrors.down_payment_egp?.[0]}
            />

            <Input
              type="number"
              min={1}
              max={360}
              required={isInstallmentOnly}
              className="bg-white"
              label="مدة التقسيط (بالأشهر)"
              placeholder="مثال: 36"
              suffix="شهر"
              value={installmentPeriodMonths}
              onChange={(e) => setInstallmentPeriodMonths(e.target.value)}
              error={fieldErrors.installment_period_months?.[0]}
            />
          </div>
        )}
      </div>

      {/* Section 3: Architectural & Physical Specifications */}
      <div className="space-y-5">
        <div>
          <span className="text-xs font-bold text-[#C59B4E]">03 · المواصفات الهندسية</span>
          <h3 className="text-lg font-extrabold text-[#131E26]">
            المساحة، التقسيم الداخلي، والموقف القانوني
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Input
            type="number"
            min={1}
            step="0.01"
            required
            label="المساحة الإجمالية (م²)"
            placeholder="مثال: 185"
            suffix="م²"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value)}
            error={fieldErrors.area_sqm?.[0]}
          />

          <Input
            type="number"
            min={0}
            max={50}
            label="عدد غرف النوم"
            placeholder="مثال: 3"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            error={fieldErrors.bedrooms?.[0]}
          />

          <Input
            type="number"
            min={0}
            max={50}
            label="عدد الحمامات"
            placeholder="مثال: 2"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            error={fieldErrors.bathrooms?.[0]}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Input
            type="number"
            min={-5}
            max={100}
            label="رقم الطابق (0 للأرضي)"
            placeholder="مثال: 4"
            value={floorLevel}
            onChange={(e) => setFloorLevel(e.target.value)}
            error={fieldErrors.floor_level?.[0]}
          />

          <Input
            type="number"
            min={1}
            max={100}
            label="إجمالي طوابق العقار"
            placeholder="مثال: 11"
            value={totalFloors}
            onChange={(e) => setTotalFloors(e.target.value)}
            error={fieldErrors.total_floors?.[0]}
          />

          <Input
            type="number"
            min={1800}
            max={2035}
            label="سنة البناء"
            placeholder="مثال: 2024"
            value={buildingYear}
            onChange={(e) => setBuildingYear(e.target.value)}
            error={fieldErrors.building_year?.[0]}
          />

          <Input
            type="number"
            min={1}
            max={100}
            step="0.5"
            label="عرض الشارع (متر)"
            placeholder="مثال: 16"
            suffix="م"
            value={streetWidthMeters}
            onChange={(e) => setStreetWidthMeters(e.target.value)}
            error={fieldErrors.street_width_meters?.[0]}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Select
            label="مستوى التشطيب"
            placeholderOption="غير محدد"
            value={finishingType}
            onChange={(e) => setFinishingType(e.target.value as FinishingType | '')}
            options={Object.entries(FINISHING_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            error={fieldErrors.finishing_type?.[0]}
          />

          <Select
            label="اتجاه الواجهة"
            placeholderOption="غير محدد"
            value={facadeType}
            onChange={(e) => setFacadeType(e.target.value as FacadeType | '')}
            options={Object.entries(FACADE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            error={fieldErrors.facade_type?.[0]}
          />

          <Select
            label="الموقف القانوني المصرّح به"
            placeholderOption="غير محدد"
            value={declaredLegalStatus}
            onChange={(e) => setDeclaredLegalStatus(e.target.value as LegalStatus | '')}
            options={Object.entries(LEGAL_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            error={fieldErrors.declared_legal_status?.[0]}
          />
        </div>

        {/* Utilities Checkboxes */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
          {[
            {
              label: 'مصعد كهربائي',
              checked: hasElevator,
              onChange: setHasElevator,
            },
            {
              label: 'عداد كهرباء مستقل',
              checked: hasElectricityMeter,
              onChange: setHasElectricityMeter,
            },
            {
              label: 'عداد مياه',
              checked: hasWaterMeter,
              onChange: setHasWaterMeter,
            },
            {
              label: 'غاز طبيعي',
              checked: hasNaturalGas,
              onChange: setHasNaturalGas,
            },
          ].map((util) => (
            <label
              key={util.label}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl p-3.5 text-xs font-bold transition ${
                util.checked
                  ? 'bg-[#131E26] text-white'
                  : 'bg-[#FAF7F2] text-[#131E26] hover:bg-[#F3EDE2]'
              }`}
            >
              <input
                type="checkbox"
                checked={util.checked}
                onChange={(e) => util.onChange(e.target.checked)}
                className="h-4 w-4 accent-[#C59B4E]"
              />
              <span>{util.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 4: Narrative Description & Contact Info */}
      <div className="space-y-5">
        <div className="space-y-1.5 text-start">
          <label
            htmlFor="prop-desc-ar"
            className="block text-xs font-bold text-[#131E26]"
          >
            الوصف التفصيلي للعقار (10 أحرف على الأقل){' '}
            <span className="ms-1 text-[#C59B4E]">*</span>
          </label>
          <textarea
            id="prop-desc-ar"
            rows={5}
            required
            placeholder="اشرح تفاصيل التقسيم الداخلي، الإطلالة، المرافق القريبة، وتفاصيل خطة الدفع..."
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            className="w-full rounded-2xl bg-[#FAF7F2] p-4 text-sm text-[#131E26] ring-1 ring-[#131E26]/10 placeholder:text-[#78828A] transition-all focus:bg-white focus:ring-2 focus:ring-[#C59B4E] focus:outline-none"
          />
          {fieldErrors.description_ar?.[0] && (
            <p className="text-xs font-semibold text-red-700">
              {fieldErrors.description_ar[0]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="رقم هاتف التواصل على الإعلان"
            dir="ltr"
            placeholder="010xxxxxxxx"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            error={fieldErrors.contact_phone?.[0]}
          />

          <Input
            label="رقم واتساب للتواصل المباشر"
            dir="ltr"
            placeholder="010xxxxxxxx"
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            error={fieldErrors.contact_whatsapp?.[0]}
          />
        </div>
      </div>

      {/* Submit Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
        {mode === 'portal-create' && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            isLoading={isSubmitting}
            onClick={() => void validateAndDispatch(false)}
          >
            حفظ كمسودة (بدون إرسال)
          </Button>
        )}

        <Button type="submit" variant="gold" size="lg" isLoading={isSubmitting}>
          {mode === 'portal-create'
            ? 'حفظ وإرسال للمراجعة'
            : mode === 'admin-create'
              ? 'نشر العقار مباشرة الآن (OD-01)'
              : 'حفظ التعديلات'}
        </Button>
      </div>
    </form>
  );
}
