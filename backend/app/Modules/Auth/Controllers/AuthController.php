<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Enums\AccountType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\RegisterRequest;
use App\Modules\User\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Handle public user registration.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $accountType = AccountType::from($validated['account_type']);
        $companyName = in_array($accountType, [AccountType::Broker, AccountType::Company], true)
            ? ($validated['company_name'] ?? null)
            : null;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'whatsapp_number' => $validated['whatsapp_number'] ?? $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => UserRole::User,
            'account_type' => $accountType,
            'company_name' => $companyName,
            'status' => UserStatus::Active,
        ]);

        Auth::guard('web')->login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return ApiResponse::success(
            data: new UserResource($user),
            message: 'تم إنشاء الحساب بنجاح',
            statusCode: Response::HTTP_CREATED
        );
    }

    /**
     * Handle stateful session login.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return ApiResponse::error(
                message: 'بيانات تسجيل الدخول غير صحيحة',
                errorCode: 'INVALID_CREDENTIALS',
                statusCode: Response::HTTP_UNAUTHORIZED
            );
        }

        if (! $user->isActive()) {
            return ApiResponse::error(
                message: 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع إدارة المنصة.',
                errorCode: 'ACCOUNT_SUSPENDED',
                statusCode: Response::HTTP_FORBIDDEN
            );
        }

        Auth::guard('web')->login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return ApiResponse::success(
            data: new UserResource($user),
            message: 'تم تسجيل الدخول بنجاح'
        );
    }

    /**
     * Handle session logout.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return ApiResponse::success(
            data: null,
            message: 'تم تسجيل الخروج بنجاح'
        );
    }

    /**
     * Get the authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(
            data: new UserResource($request->user())
        );
    }
}

