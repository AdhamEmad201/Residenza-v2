<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Resources;

use App\Enums\TransactionType;
use App\Modules\Media\Resources\PropertyDocumentResource;
use App\Modules\Media\Resources\PropertyImageResource;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Resources\CategoryResource;
use App\Modules\Taxonomy\Resources\LocationResource;
use App\Modules\User\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminPropertyResource extends JsonResource
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
            'user_id' => $this->user_id,
            'category_id' => $this->category_id,
            'location_id' => $this->location_id,
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
            'moderation_status' => $this->moderation_status?->value ?? $this->moderation_status,
            'availability_status' => $this->availability_status?->value ?? $this->availability_status,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'is_featured' => (bool) $this->is_featured,
            'views_count' => (int) ($this->views_count ?? 0),
            'whatsapp_clicks' => (int) ($this->whatsapp_clicks ?? 0),
            'phone_clicks' => (int) ($this->phone_clicks ?? 0),
            'is_potential_duplicate' => $this->computePotentialDuplicate(),
            'is_suspicious_price' => $this->computeSuspiciousPrice(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => new UserResource($this->user)),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? new UserResource($this->reviewer) : null),
            'category' => $this->whenLoaded('category', fn () => new CategoryResource($this->category)),
            'location' => $this->whenLoaded('location', fn () => new LocationResource($this->location)),
            'images' => $this->whenLoaded('images', fn () => PropertyImageResource::collection($this->images)),
            'documents' => $this->whenLoaded('documents', fn () => PropertyDocumentResource::collection($this->documents)),
            'moderation_logs' => $this->whenLoaded('moderationLogs', fn () => $this->moderationLogs->map(fn ($log) => [
                'id' => $log->id,
                'actor_id' => $log->actor_id,
                'actor_name' => $log->relationLoaded('actor') ? $log->actor?->name : null,
                'from_status' => $log->from_status?->value ?? $log->from_status,
                'to_status' => $log->to_status?->value ?? $log->to_status,
                'action' => $log->action,
                'notes' => $log->notes,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values()),
        ];
    }

    private function computePotentialDuplicate(): bool
    {
        return Property::query()
            ->where('id', '!=', $this->id)
            ->where('user_id', $this->user_id)
            ->where(function ($q) {
                $q->where(function ($sub) {
                    $sub->where('location_id', $this->location_id)
                        ->where('area_sqm', $this->area_sqm)
                        ->where('price_egp', $this->price_egp);
                })->orWhere('title_ar', $this->title_ar);
            })
            ->exists();
    }

    private function computeSuspiciousPrice(): bool
    {
        $price = (float) $this->price_egp;
        $area = (float) $this->area_sqm;
        $tx = $this->transaction_type instanceof TransactionType
            ? $this->transaction_type->value
            : (string) $this->transaction_type;

        if ($tx === TransactionType::Sale->value) {
            $pricePerSqm = $area > 0 ? $price / $area : 0;

            return $price < 10000 || $price > 500000000 || ($area > 0 && $pricePerSqm < 500);
        }

        return $price < 300 || $price > 1000000;
    }
}
