<?php

declare(strict_types=1);

namespace App\Modules\Company\Requests;

use App\Modules\Company\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertCompanyRequest extends FormRequest
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
        $existingCompanyId = $this->user()?->company?->id;

        return [
            'name' => ['required', 'string', 'min:2', 'max:200'],
            'slug' => [
                'nullable',
                'string',
                'max:220',
                'regex:/^[a-zA-Z0-9\p{Arabic}-]+$/u',
                Rule::notIn(Company::RESERVED_SLUGS),
                Rule::unique('companies', 'slug')->ignore($existingCompanyId),
            ],
            'bio' => ['nullable', 'string', 'max:3000'],
            'address' => ['nullable', 'string', 'max:300'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'accent_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048'],
            'cover' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048'],
        ];
    }
}
