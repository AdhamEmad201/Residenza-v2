<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ModerationDecisionRequest extends FormRequest
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
        if (str_ends_with($this->path(), '/approve')) {
            return [
                'notes' => ['nullable', 'string', 'max:2000'],
            ];
        }

        return [
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }
}
