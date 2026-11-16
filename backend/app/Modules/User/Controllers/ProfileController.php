<?php

declare(strict_types=1);

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\User\Requests\UpdateProfileRequest;
use App\Modules\User\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Update the authenticated user's profile.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $companyName = in_array($user->account_type, [\App\Enums\AccountType::Broker, \App\Enums\AccountType::Company], true)
            ? ($validated['company_name'] ?? null)
            : null;

        $updateData = [
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'whatsapp_number' => $validated['whatsapp_number'] ?? $user->whatsapp_number ?? $validated['phone'],
            'company_name' => $companyName,
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return ApiResponse::success(
            data: new UserResource($user->fresh()),
            message: 'تم تحديث الملف الشخصي بنجاح'
        );
    }
}

