<?php

declare(strict_types=1);

namespace App\Modules\User\Controllers;

use App\Enums\AccountType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Requests\UpdateUserStatusRequest;
use App\Modules\User\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if (is_string($role = $request->query('role')) && UserRole::tryFrom($role) !== null) {
            $query->where('role', $role);
        }

        if (is_string($accountType = $request->query('account_type')) && AccountType::tryFrom($accountType) !== null) {
            $query->where('account_type', $accountType);
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

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min(50, $perPage));

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

    public function updateStatus(UpdateUserStatusRequest $request, User $user): JsonResponse
    {
        $newStatus = UserStatus::from((string) $request->validated('status'));

        if ((int) $request->user()->id === (int) $user->id && $newStatus === UserStatus::Suspended) {
            return ApiResponse::error(
                'لا يمكن للمدير تعليق حسابه الشخصي.',
                'SELF_SUSPENSION_FORBIDDEN',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $user->status = $newStatus;
        $user->save();

        return ApiResponse::success(
            new UserResource($user),
            'تم تحديث حالة المستخدم بنجاح'
        );
    }
}
