<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Admin\Services\AdminAuditLogger;
use App\Modules\Company\Models\Company;
use App\Modules\User\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class AdminControlAccountsController extends Controller
{
    public function usersIndex(Request $request): JsonResponse
    {
        $query = User::query();

        if (is_string($role = $request->query('role')) && UserRole::tryFrom($role) !== null) {
            $query->where('role', $role);
        }

        if ($request->boolean('online')) {
            $query->whereNotNull('last_seen_at')
                ->where('last_seen_at', '>=', now()->subMinutes(5));
        }

        if ($request->has('is_active') && $request->query('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if (is_string($status = $request->query('status')) && UserStatus::tryFrom($status) !== null) {
            $query->where('status', $status);
        }

        if (is_string($search = $request->query('q')) && trim($search) !== '') {
            $escaped = addcslashes(trim($search), '%_\\');
            $like = "%{$escaped}%";
            $query->where(function (Builder $q) use ($like) {
                $q->where('name', 'LIKE', $like)
                    ->orWhere('email', 'LIKE', $like)
                    ->orWhere('phone', 'LIKE', $like);
            });
        }

        $query->orderByDesc('created_at')->orderByDesc('id');
        $perPage = max(1, min(50, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            UserResource::collection($paginator->items()),
            'تم جلب قائمة المستخدمين بنجاح',
            Response::HTTP_OK,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function updateUserRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in([UserRole::User->value, UserRole::Admin->value])],
        ]);

        $newRole = UserRole::from($validated['role']);
        $admin = $request->user();

        if ((int) $admin->id === (int) $user->id && $newRole !== UserRole::Admin) {
            return ApiResponse::error(
                'لا يمكن للمدير إزالة صلاحية الإدارة عن حسابه الشخصي.',
                'SELF_DEMOTION_FORBIDDEN',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $previousRole = $user->role instanceof UserRole ? $user->role->value : (string) $user->role;
        $user->role = $newRole;
        $user->save();

        AdminAuditLogger::log($admin, 'user.role.update', 'user', $user->id, [
            'from' => $previousRole,
            'to' => $newRole->value,
        ]);

        return ApiResponse::success(new UserResource($user), 'تم تحديث صلاحية المستخدم بنجاح');
    }

    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([UserStatus::Active->value, UserStatus::Suspended->value])],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (! array_key_exists('status', $validated) && ! array_key_exists('is_active', $validated)) {
            return ApiResponse::error(
                'يرجى تحديد الحالة الجديدة للمستخدم.',
                'VALIDATION_ERROR',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $willBeActive = array_key_exists('is_active', $validated)
            ? (bool) $validated['is_active']
            : ($validated['status'] === UserStatus::Active->value);

        $admin = $request->user();
        if ((int) $admin->id === (int) $user->id && ! $willBeActive) {
            return ApiResponse::error(
                'لا يمكن للمدير تعليق حسابه الشخصي.',
                'SELF_SUSPENSION_FORBIDDEN',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $user->is_active = $willBeActive;
        $user->status = $willBeActive ? UserStatus::Active : UserStatus::Suspended;
        $user->save();

        AdminAuditLogger::log($admin, 'user.status.update', 'user', $user->id, [
            'is_active' => $willBeActive,
            'status' => $user->status->value,
        ]);

        return ApiResponse::success(new UserResource($user), 'تم تحديث حالة المستخدم بنجاح');
    }

    public function companiesIndex(Request $request): JsonResponse
    {
        $query = Company::query()
            ->with('user:id,name,email,phone')
            ->withCount(['properties', 'projects']);

        if ($request->has('is_verified') && $request->query('is_verified') !== '') {
            $query->where('is_verified', $request->boolean('is_verified'));
        }

        if (is_string($tier = $request->query('plan_tier')) && in_array($tier, ['free', 'partner', 'enterprise'], true)) {
            $query->where('plan_tier', $tier);
        }

        if (is_string($search = $request->query('q')) && trim($search) !== '') {
            $escaped = addcslashes(trim($search), '%_\\');
            $like = "%{$escaped}%";
            $query->where(function (Builder $q) use ($like) {
                $q->where('name', 'LIKE', $like)
                    ->orWhere('slug', 'LIKE', $like)
                    ->orWhere('address', 'LIKE', $like);
            });
        }

        $query->orderByDesc('is_verified')->orderByDesc('id');
        $perPage = max(1, min(50, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            $paginator->items(),
            'تم جلب قائمة الشركات بنجاح',
            Response::HTTP_OK,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function updateCompany(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'is_verified' => ['nullable', 'boolean'],
            'plan_tier' => ['nullable', Rule::in(['free', 'partner', 'enterprise'])],
            'max_properties' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'plan_expires_at' => ['nullable', 'date'],
        ]);

        $changes = [];
        if (array_key_exists('is_verified', $validated)) {
            $company->is_verified = (bool) $validated['is_verified'];
            $changes['is_verified'] = $company->is_verified;
        }
        if (array_key_exists('plan_tier', $validated) && $validated['plan_tier'] !== null) {
            $company->plan_tier = $validated['plan_tier'];
            $changes['plan_tier'] = $company->plan_tier;
        }
        if (array_key_exists('max_properties', $validated) && $validated['max_properties'] !== null) {
            $company->max_properties = (int) $validated['max_properties'];
            $changes['max_properties'] = $company->max_properties;
        }
        if (array_key_exists('plan_expires_at', $validated)) {
            $company->plan_expires_at = $validated['plan_expires_at'];
            $changes['plan_expires_at'] = $validated['plan_expires_at'];
        }

        $company->save();

        AdminAuditLogger::log($request->user(), 'company.update', 'company', $company->id, $changes);

        return ApiResponse::success($company->fresh(), 'تم تحديث بيانات الشركة والباقة بنجاح');
    }
}
