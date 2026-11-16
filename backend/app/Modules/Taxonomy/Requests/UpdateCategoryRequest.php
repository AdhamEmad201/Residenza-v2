<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Requests;

use App\Enums\PropertyType;
use App\Modules\Taxonomy\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
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
        /** @var Category|null $category */
        $category = $this->route('category');

        return [
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('categories', 'id')],
            'property_type' => ['sometimes', 'string', Rule::enum(PropertyType::class)],
            'name_ar' => ['sometimes', 'string', 'min:2', 'max:120'],
            'name_en' => ['sometimes', 'nullable', 'string', 'max:120'],
            'slug' => [
                'sometimes',
                'string',
                'max:150',
                'regex:/^[a-z0-9-]+$/',
                Rule::unique('categories', 'slug')->ignore($category?->id),
            ],
            'icon' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ];
    }
}
