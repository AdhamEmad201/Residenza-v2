<?php

declare(strict_types=1);

namespace App\Modules\Company\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_path' => $this->logo_path,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
            'cover_path' => $this->cover_path,
            'cover_url' => $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null,
            'bio' => $this->bio,
            'address' => $this->address,
            'whatsapp' => $this->whatsapp,
            'phone' => $this->phone,
            'accent_color' => $this->accent_color ?: '#9F7753',
            'is_verified' => (bool) $this->is_verified,
            'properties_count' => $this->when(isset($this->properties_count), (int) $this->properties_count),
            'projects_count' => $this->when(isset($this->projects_count), (int) $this->projects_count),
            'projects' => $this->whenLoaded('projects', fn () => ProjectResource::collection($this->projects)),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
