<?php

declare(strict_types=1);

namespace App\Modules\Property\Requests;

use App\Enums\FacadeType;
use App\Enums\FinishingType;
use App\Enums\LegalStatus;
use App\Enums\PaymentMethod;
use App\Enums\RentalPeriod;
use App\Enums\TransactionType;
use App\Modules\Property\Models\Property;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePropertyRequest extends FormRequest
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
            'project_id' => ['sometimes', 'nullable', 'integer', 'exists:projects,id'],
            'category_id' => ['sometimes', 'integer', Rule::exists('categories', 'id')->where('is_active', true)],
            'location_id' => ['sometimes', 'integer', Rule::exists('locations', 'id')->where('is_active', true)],
            'transaction_type' => ['sometimes', 'string', Rule::enum(TransactionType::class)],
            'payment_method' => ['sometimes', 'nullable', 'string', Rule::enum(PaymentMethod::class)],
            'rental_period' => ['sometimes', 'nullable', 'string', Rule::enum(RentalPeriod::class)],
            'title_ar' => ['sometimes', 'string', 'min:5', 'max:200'],
            'description_ar' => ['sometimes', 'string', 'min:10', 'max:10000'],
            'price_egp' => ['sometimes', 'numeric', 'gt:0', 'max:999999999999.99'],
            'installment_price_egp' => ['sometimes', 'nullable', 'numeric', 'gt:0', 'max:999999999999.99'],
            'down_payment_egp' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'installment_period_months' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:360'],
            'insurance_deposit_egp' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'area_sqm' => ['sometimes', 'numeric', 'gt:0', 'max:99999999.99'],
            'bedrooms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50'],
            'bathrooms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50'],
            'floor_level' => ['sometimes', 'nullable', 'integer', 'min:-5', 'max:100'],
            'total_floors' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'finishing_type' => ['sometimes', 'nullable', 'string', Rule::enum(FinishingType::class)],
            'building_year' => ['sometimes', 'nullable', 'integer', 'min:1800', "max:{$maxBuildingYear}"],
            'street_width_meters' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:100'],
            'facade_type' => ['sometimes', 'nullable', 'string', Rule::enum(FacadeType::class)],
            'declared_legal_status' => ['sometimes', 'nullable', 'string', Rule::enum(LegalStatus::class)],
            'has_elevator' => ['sometimes', 'boolean'],
            'has_electricity_meter' => ['sometimes', 'boolean'],
            'has_water_meter' => ['sometimes', 'boolean'],
            'has_natural_gas' => ['sometimes', 'boolean'],
            'address_details_ar' => ['sometimes', 'string', 'min:5', 'max:300'],
            'contact_phone' => ['sometimes', 'string', 'regex:/^01[0125][0-9]{8}$/'],
            'contact_whatsapp' => ['sometimes', 'string', 'regex:/^01[0125][0-9]{8}$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            /** @var Property|null $property */
            $property = $this->route('property');
            if (!$property instanceof Property) {
                return;
            }

            $merged = array_merge([
                'transaction_type' => $property->transaction_type?->value ?? $property->transaction_type,
                'payment_method' => $property->payment_method?->value ?? $property->payment_method,
                'rental_period' => $property->rental_period?->value ?? $property->rental_period,
                'price_egp' => $property->price_egp,
                'installment_price_egp' => $property->installment_price_egp,
                'down_payment_egp' => $property->down_payment_egp,
                'installment_period_months' => $property->installment_period_months,
                'insurance_deposit_egp' => $property->insurance_deposit_egp,
                'floor_level' => $property->floor_level,
                'total_floors' => $property->total_floors,
            ], $this->validated());

            StorePropertyRequest::validateCrossFieldInvariants($v, $merged);
        });
    }
}
