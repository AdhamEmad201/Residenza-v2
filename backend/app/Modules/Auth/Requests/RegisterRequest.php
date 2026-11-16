<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Enums\AccountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^(\+201|01)[0125][0-9]{8}$/', 'unique:users,phone'],
            'whatsapp_number' => ['nullable', 'string', 'regex:/^(\+201|01)[0125][0-9]{8}$/'],
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers(), 'confirmed'],
            'account_type' => ['required', 'string', Rule::in(['individual', 'broker', 'company'])],
            'company_name' => ['nullable', 'required_if:account_type,broker,company', 'string', 'max:200'],
        ];
    }
}

