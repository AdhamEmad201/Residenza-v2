<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Requests;

use App\Enums\LocationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLocationRequest extends FormRequest
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
        $parentId = $this->input('parent_id');

        $slugUnique = $parentId === null || $parentId === ''
            ? Rule::unique('locations', 'slug')->whereNull('parent_id')
            : Rule::unique('locations', 'slug')->where('parent_id', (int) $parentId);

        return [
            'parent_id' => ['nullable', 'integer', Rule::exists('locations', 'id')],
            'type' => ['required', 'string', Rule::enum(LocationType::class)],
            'name_ar' => ['required', 'string', 'min:2', 'max:120'],
            'name_en' => ['nullable', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:150', 'regex:/^[a-z0-9-]+$/', $slugUnique],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ];
    }
}
