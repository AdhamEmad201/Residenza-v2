<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Modules\Admin\Services\AdminAuditLogger;
use App\Modules\Property\Models\Property;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class AdminControlPropertiesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->with(['user:id,name,email,phone', 'company:id,name,slug', 'category:id,name_ar', 'location:id,name_ar', 'images']);

        $statusFilter = $request->query('status');
        if (is_string($statusFilter) && $statusFilter !== '') {
            match ($statusFilter) {
                'pending', 'pending_review' => $query->whereIn('moderation_status', [ModerationStatus::PendingReview->value, 'pending']),
                'approved' => $query->where('moderation_status', ModerationStatus::Approved->value),
                'rejected' => $query->where('moderation_status', ModerationStatus::Rejected->value),
                'stale' => $query->where('moderation_status', ModerationStatus::Approved->value)
                    ->where('availability_status', AvailabilityStatus::Available->value)
                    ->where('created_at', '<=', now()->subDays(45)),
                default => null,
            };
        }

        if (is_string($search = $request->query('q')) && trim($search) !== '') {
            $escaped = addcslashes(trim($search), '%_\\');
            $like = "%{$escaped}%";
            $query->where(function (Builder $q) use ($like) {
                $q->where('title_ar', 'LIKE', $like)
                    ->orWhere('address_details_ar', 'LIKE', $like)
                    ->orWhere('reference_code', 'LIKE', $like);
            });
        }

        $query->orderByDesc('created_at')->orderByDesc('id');

        $perPage = max(1, min(50, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(function (Property $property) {
            $isDuplicate = Property::query()
                ->where('id', '!=', $property->id)
                ->where('user_id', $property->user_id)
                ->where(function (Builder $q) use ($property) {
                    $q->where(function (Builder $sub) use ($property) {
                        $sub->where('location_id', $property->location_id)
                            ->where('area_sqm', $property->area_sqm)
                            ->where('price_egp', $property->price_egp);
                    })->orWhere('title_ar', $property->title_ar);
                })
                ->exists();

            $price = (float) $property->price_egp;
            $area = (float) $property->area_sqm;
            $tx = $property->transaction_type instanceof TransactionType
                ? $property->transaction_type->value
                : (string) $property->transaction_type;

            $isSuspiciousPrice = false;
            if ($tx === TransactionType::Sale->value) {
                $pricePerSqm = $area > 0 ? $price / $area : 0;
                $isSuspiciousPrice = $price < 10000 || $price > 500000000 || ($area > 0 && $pricePerSqm < 500);
            } else {
                $isSuspiciousPrice = $price < 300 || $price > 1000000;
            }

            return array_merge($property->toArray(), [
                'is_potential_duplicate' => $isDuplicate,
                'is_suspicious_price' => $isSuspiciousPrice,
            ]);
        })->values();

        return ApiResponse::success(
            $items,
            'تم جلب قائمة العقارات للإدارة بنجاح',
            Response::HTTP_OK,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function moderate(Request $request, int $id): JsonResponse
    {
        $property = Property::query()->find($id);
        if (! $property) {
            return ApiResponse::error('العقار غير موجود.', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'action' => ['nullable', Rule::in(['approve', 'reject', 'feature', 'unfeature'])],
            'status' => ['nullable', Rule::in(['approved', 'rejected'])],
            'rejection_reason' => ['nullable', 'string', 'max:2000'],
            'is_featured' => ['nullable', 'boolean'],
        ]);

        $action = $validated['action'] ?? ($validated['status'] === 'approved' ? 'approve' : ($validated['status'] === 'rejected' ? 'reject' : null));

        if ($action === 'reject' && trim((string) ($validated['rejection_reason'] ?? '')) === '') {
            return ApiResponse::error(
                'يرجى ذكر سبب الرفض.',
                'REJECTION_REASON_REQUIRED',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $admin = $request->user();

        if ($action === 'approve') {
            $property->moderation_status = ModerationStatus::Approved;
            $property->rejection_reason = null;
            $property->reviewed_by = $admin->id;
            $property->reviewed_at = now();
            if ($property->published_at === null) {
                $property->published_at = now();
            }
        } elseif ($action === 'reject') {
            $property->moderation_status = ModerationStatus::Rejected;
            $property->rejection_reason = trim((string) $validated['rejection_reason']);
            $property->reviewed_by = $admin->id;
            $property->reviewed_at = now();
        } elseif ($action === 'feature') {
            $property->is_featured = true;
        } elseif ($action === 'unfeature') {
            $property->is_featured = false;
        }

        if (array_key_exists('is_featured', $validated)) {
            $property->is_featured = (bool) $validated['is_featured'];
        }

        $property->save();

        AdminAuditLogger::log(
            $admin,
            'property.moderate.' . ($action ?? 'update'),
            'property',
            $property->id,
            [
                'moderation_status' => $property->moderation_status instanceof ModerationStatus
                    ? $property->moderation_status->value
                    : $property->moderation_status,
                'is_featured' => (bool) $property->is_featured,
                'rejection_reason' => $property->rejection_reason,
            ]
        );

        return ApiResponse::success($property->fresh(), 'تم تحديث حالة العقار بنجاح');
    }
}
