<?php

declare(strict_types=1);

namespace App\Modules\Property\Resources;

use App\Modules\Media\Resources\PropertyImageResource;
use App\Modules\Taxonomy\Resources\CategoryResource;
use App\Modules\Taxonomy\Resources\LocationResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicPropertyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_code' => $this->reference_code,
            'slug' => $this->slug,
            'transaction_type' => $this->transaction_type?->value ?? $this->transaction_type,
            'payment_method' => $this->payment_method?->value ?? $this->payment_method,
            'rental_period' => $this->rental_period?->value ?? $this->rental_period,
            'title_ar' => $this->title_ar,
            'description_ar' => $this->description_ar,
            'price_egp' => $this->price_egp !== null ? (string) $this->price_egp : null,
            'installment_price_egp' => $this->installment_price_egp !== null ? (string) $this->installment_price_egp : null,
            'down_payment_egp' => $this->down_payment_egp !== null ? (string) $this->down_payment_egp : null,
            'installment_period_months' => $this->installment_period_months,
            'insurance_deposit_egp' => $this->insurance_deposit_egp !== null ? (string) $this->insurance_deposit_egp : null,
            'area_sqm' => $this->area_sqm !== null ? (string) $this->area_sqm : null,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'floor_level' => $this->floor_level,
            'total_floors' => $this->total_floors,
            'finishing_type' => $this->finishing_type?->value ?? $this->finishing_type,
            'building_year' => $this->building_year,
            'street_width_meters' => $this->street_width_meters !== null ? (string) $this->street_width_meters : null,
            'facade_type' => $this->facade_type?->value ?? $this->facade_type,
            'declared_legal_status' => $this->declared_legal_status?->value ?? $this->declared_legal_status,
            'has_elevator' => (bool) $this->has_elevator,
            'has_electricity_meter' => (bool) $this->has_electricity_meter,
            'has_water_meter' => (bool) $this->has_water_meter,
            'has_natural_gas' => (bool) $this->has_natural_gas,
            'address_details_ar' => $this->address_details_ar,
            'contact_phone' => $this->contact_phone,
            'contact_whatsapp' => $this->contact_whatsapp,
            'availability_status' => $this->availability_status?->value ?? $this->availability_status,
            'is_featured' => (bool) $this->is_featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'category' => $this->whenLoaded('category', fn () => new CategoryResource($this->category)),
            'location' => $this->whenLoaded('location', fn () => new LocationResource($this->location)),
            'images' => $this->whenLoaded('images', fn () => PropertyImageResource::collection($this->images)),
            'owner_display' => $this->whenLoaded('user', fn () => [
                'name' => $this->user->name,
                'account_type' => $this->user->account_type?->value ?? $this->user->account_type,
                'company_name' => $this->user->company_name,
            ]),
        ];
    }
}
