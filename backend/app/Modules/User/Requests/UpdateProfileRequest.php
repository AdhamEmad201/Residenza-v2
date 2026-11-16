<?php

declare(strict_types=1);

namespace App\Modules\User\Requests;

use App\Enums\AccountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'phone' => [
                'required',
                'string',
                'regex:/^(\+201|01)[0125][0-9]{8}$/',
                Rule::unique('users', 'phone')->ignore($user?->id),
            ],
            'whatsapp_number' => ['nullable', 'string', 'regex:/^(\+201|01)[0125][0-9]{8}$/'],
            'company_name' => [
                'nullable',
                Rule::requiredIf(fn () => in_array($user?->account_type, [AccountType::Broker, AccountType::Company], true)),
                'string',
                'max:200',
            ],
            'current_password' => [
                'bail',
                'nullable',
                'required_with:password',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) use ($user): void {
                    if (! $this->filled('password')) {
                        return;
                    }
                    if (! is_string($value) || ! $user || ! Hash::check($value, $user->password)) {
                        $fail('كلمة المرور الحالية غير صحيحة.');
                    }
                },
            ],
            'password' => ['nullable', 'string', Password::min(8)->letters()->mixedCase()->numbers(), 'confirmed'],
        ];
    }
}
