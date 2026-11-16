<?php

declare(strict_types=1);

namespace App\Modules\Property\Requests;

use App\Enums\FacadeType;
use App\Enums\FinishingType;
use App\Enums\LegalStatus;
use App\Enums\PaymentMethod;
use App\Enums\RentalPeriod;
use App\Enums\TransactionType;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxBuildingYear = Carbon::now('Africa/Cairo')->year + 5;

        return [
            'submit' => ['sometimes', 'boolean'],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->where('is_active', true)],
            'location_id' => ['required', 'integer', Rule::exists('locations', 'id')->where('is_active', true)],
            'transaction_type' => ['required', 'string', Rule::enum(TransactionType::class)],
            'payment_method' => ['nullable', 'string', Rule::enum(PaymentMethod::class)],
            'rental_period' => ['nullable', 'string', Rule::enum(RentalPeriod::class)],
            'title_ar' => ['required', 'string', 'min:5', 'max:200'],
            'description_ar' => ['required', 'string', 'min:10', 'max:10000'],
            'price_egp' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'installment_price_egp' => ['nullable', 'numeric', 'gt:0', 'max:999999999999.99'],
            'down_payment_egp' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'installment_period_months' => ['nullable', 'integer', 'min:1', 'max:360'],
            'insurance_deposit_egp' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'area_sqm' => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'floor_level' => ['nullable', 'integer', 'min:-5', 'max:100'],
            'total_floors' => ['nullable', 'integer', 'min:1', 'max:100'],
            'finishing_type' => ['nullable', 'string', Rule::enum(FinishingType::class)],
            'building_year' => ['nullable', 'integer', 'min:1800', "max:{$maxBuildingYear}"],
            'street_width_meters' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'facade_type' => ['nullable', 'string', Rule::enum(FacadeType::class)],
            'declared_legal_status' => ['nullable', 'string', Rule::enum(LegalStatus::class)],
            'has_elevator' => ['sometimes', 'boolean'],
            'has_electricity_meter' => ['sometimes', 'boolean'],
            'has_water_meter' => ['sometimes', 'boolean'],
            'has_natural_gas' => ['sometimes', 'boolean'],
            'address_details_ar' => ['required', 'string', 'min:5', 'max:300'],
            'contact_phone' => ['nullable', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'contact_whatsapp' => ['nullable', 'string', 'regex:/^01[0125][0-9]{8}$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $data = $this->all();
            self::validateCrossFieldInvariants($v, $data);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function validateCrossFieldInvariants(Validator $v, array $data): void
    {
        $txType = $data['transaction_type'] ?? null;
        $pm = $data['payment_method'] ?? null;
        $price = isset($data['price_egp']) ? (float) $data['price_egp'] : null;
        $instPrice = isset($data['installment_price_egp']) && $data['installment_price_egp'] !== '' ? (float) $data['installment_price_egp'] : null;
        $downPayment = isset($data['down_payment_egp']) && $data['down_payment_egp'] !== '' ? (float) $data['down_payment_egp'] : null;
        $months = $data['installment_period_months'] ?? null;
        $rentalPeriod = $data['rental_period'] ?? null;
        $deposit = $data['insurance_deposit_egp'] ?? null;

        if ($txType === TransactionType::Sale->value) {
            if ($pm === null) {
                $v->errors()->add('payment_method', 'طريقة الدفع مطلوبة لعقارات البيع.');
                return;
            }

            if ($rentalPeriod !== null) {
                $v->errors()->add('rental_period', 'فترة الإيجار غير مسموح بها لعقارات البيع.');
            }
            if ($deposit !== null) {
                $v->errors()->add('insurance_deposit_egp', 'مبلغ التأمين غير مسموح به لعقارات البيع.');
            }

            if ($pm === PaymentMethod::Cash->value) {
                if ($instPrice !== null) {
                    $v->errors()->add('installment_price_egp', 'سعر التقسيط غير مسموح به في البيع النقدي.');
                }
                if ($downPayment !== null) {
                    $v->errors()->add('down_payment_egp', 'المقدم غير مسموح به في البيع النقدي.');
                }
                if ($months !== null) {
                    $v->errors()->add('installment_period_months', 'مدة التقسيط غير مسموح بها في البيع النقدي.');
                }
            } elseif ($pm === PaymentMethod::Installment->value) {
                if ($instPrice !== null) {
                    $v->errors()->add('installment_price_egp', 'لا يمكن تحديد سعر تقسيط منفصل عندما تكون طريقة الدفع تقسيط فقط.');
                }
                if ($months === null) {
                    $v->errors()->add('installment_period_months', 'مدة التقسيط مطلوبة في حالة البيع بالتقسيط.');
                }
                if ($downPayment !== null && $price !== null && ($downPayment < 0 || $downPayment >= $price)) {
                    $v->errors()->add('down_payment_egp', 'المقدم يجب أن يكون أكبر من أو يساوي 0 وأقل من السعر.');
                }
            } elseif ($pm === PaymentMethod::CashOrInstallment->value) {
                if ($instPrice === null || $instPrice <= 0) {
                    $v->errors()->add('installment_price_egp', 'سعر التقسيط مطلوب ويجب أن يكون أكبر من صفر عند اختيار كاش أو تقسيط.');
                } elseif ($downPayment !== null && ($downPayment < 0 || $downPayment >= $instPrice)) {
                    $v->errors()->add('down_payment_egp', 'المقدم يجب أن يكون أكبر من أو يساوي 0 وأقل من سعر التقسيط.');
                }
            }
        } elseif ($txType === TransactionType::Rent->value) {
            if ($rentalPeriod === null) {
                $v->errors()->add('rental_period', 'فترة الإيجار مطلوبة لعقارات الإيجار.');
            }
            if ($pm !== null) {
                $v->errors()->add('payment_method', 'طريقة الدفع غير مسموح بها لعقارات الإيجار.');
            }
            if ($instPrice !== null) {
                $v->errors()->add('installment_price_egp', 'سعر التقسيط غير مسموح به لعقارات الإيجار.');
            }
            if ($downPayment !== null) {
                $v->errors()->add('down_payment_egp', 'المقدم غير مسموح به لعقارات الإيجار.');
            }
            if ($months !== null) {
                $v->errors()->add('installment_period_months', 'مدة التقسيط غير مسموح بها لعقارات الإيجار.');
            }
        }

        $floorLevel = $data['floor_level'] ?? null;
        $totalFloors = $data['total_floors'] ?? null;
        if ($floorLevel !== null && $totalFloors !== null && (int) $floorLevel > (int) $totalFloors) {
            $v->errors()->add('floor_level', 'رقم الطابق لا يمكن أن يتجاوز إجمالي عدد الطوابق.');
        }
    }
}
