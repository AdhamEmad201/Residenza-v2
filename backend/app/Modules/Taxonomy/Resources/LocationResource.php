<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'type' => $this->type?->value ?? $this->type,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'slug' => $this->slug,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            'parent' => $this->whenLoaded('parent', fn () => new LocationResource($this->parent)),
            'children' => $this->whenLoaded('children', fn () => LocationResource::collection($this->children)),
        ];
    }
}
