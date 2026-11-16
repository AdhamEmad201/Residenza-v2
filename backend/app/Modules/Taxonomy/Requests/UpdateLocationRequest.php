<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Requests;

use App\Enums\LocationType;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocationRequest extends FormRequest
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
        /** @var Location|null $location */
        $location = $this->route('location');

        $effectiveParentId = $this->has('parent_id')
            ? $this->input('parent_id')
            : $location?->parent_id;

        $slugUnique = $effectiveParentId === null || $effectiveParentId === ''
            ? Rule::unique('locations', 'slug')->whereNull('parent_id')->ignore($location?->id)
            : Rule::unique('locations', 'slug')->where('parent_id', (int) $effectiveParentId)->ignore($location?->id);

        return [
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('locations', 'id')],
            'type' => ['sometimes', 'string', Rule::enum(LocationType::class)],
            'name_ar' => ['sometimes', 'string', 'min:2', 'max:120'],
            'name_en' => ['sometimes', 'nullable', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:150', 'regex:/^[a-z0-9-]+$/', $slugUnique],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ];
    }
}
