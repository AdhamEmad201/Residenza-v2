<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Controllers;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Modules\Moderation\Requests\AdminUpdatePropertyRequest;
use App\Modules\Moderation\Requests\ModerationDecisionRequest;
use App\Modules\Moderation\Resources\AdminPropertyResource;
use App\Modules\Moderation\Services\ModerationService;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Requests\StorePropertyRequest;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class AdminPropertyController extends Controller
{
    public function __construct(
        private readonly ModerationService $moderationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->with(['user', 'reviewer', 'category', 'location', 'images', 'documents']);

        $trashed = $request->query('trashed');
        if ($trashed === 'with') {
            $query->withTrashed();
        } elseif ($trashed === 'only') {
            $query->onlyTrashed();
        }

        if (is_string($modStatus = $request->query('moderation_status')) && ModerationStatus::tryFrom($modStatus) !== null) {
            $query->where('moderation_status', $modStatus);
        }

        if (is_string($availStatus = $request->query('availability_status')) && AvailabilityStatus::tryFrom($availStatus) !== null) {
            $query->where('availability_status', $availStatus);
        }

        if (is_string($txType = $request->query('transaction_type')) && TransactionType::tryFrom($txType) !== null) {
            $query->where('transaction_type', $txType);
        }

        if (is_numeric($catId = $request->query('category_id'))) {
            $query->where('category_id', (int) $catId);
        }

        if (is_numeric($locId = $request->query('location_id'))) {
            $query->where('location_id', (int) $locId);
        }

        if (is_numeric($userId = $request->query('user_id'))) {
            $query->where('user_id', (int) $userId);
        }

        if ($request->has('is_featured') && $request->query('is_featured') !== '') {
            $query->where('is_featured', $request->boolean('is_featured'));
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

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min(50, $perPage));

        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            AdminPropertyResource::collection($paginator->items()),
            'تم جلب العقارات بنجاح',
            Response::HTTP_OK,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function store(StorePropertyRequest $request): JsonResponse
    {
        $admin = $request->user();
        $data = $request->validated();
        unset($data['submit']);

        $data['contact_phone'] = $data['contact_phone'] ?? $admin->phone;
        $data['contact_whatsapp'] = $data['contact_whatsapp'] ?? ($admin->whatsapp_number ?: $admin->phone);
        $data['slug'] = $this->generateUniqueSlug((string) $data['title_ar']);

        $property = $this->moderationService->createDirectPublished($data, $admin);
        $property->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($property),
            'تم نشر العقار مباشرة بواسطة الإدارة بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function show(Property $property): JsonResponse
    {
        $property->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($property),
            'تم جلب تفاصيل العقار بنجاح'
        );
    }

    public function update(AdminUpdatePropertyRequest $request, Property $property): JsonResponse
    {
        $data = $request->validated();
        $availability = isset($data['availability_status'])
            ? AvailabilityStatus::from((string) $data['availability_status'])
            : null;
        $isFeatured = array_key_exists('is_featured', $data) ? (bool) $data['is_featured'] : null;

        unset($data['availability_status'], $data['is_featured']);

        DB::transaction(function () use ($property, $request, $data, $availability, $isFeatured) {
            if ($data !== []) {
                $property->fill($data);
                $property->save();
            }

            $this->moderationService->updateAdminFlags(
                $property,
                $request->user(),
                $availability,
                $isFeatured
            );
        });

        $property->refresh()->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($property),
            'تم تحديث بيانات العقار بنجاح'
        );
    }

    public function approve(ModerationDecisionRequest $request, Property $property): JsonResponse
    {
        $notes = $request->validated('notes');

        try {
            $updated = $this->moderationService->approve(
                $property,
                $request->user(),
                is_string($notes) ? $notes : null
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'INVALID_STATE_TRANSITION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $updated->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($updated),
            'تمت الموافقة على العقار ونشره بنجاح'
        );
    }

    public function requestChanges(ModerationDecisionRequest $request, Property $property): JsonResponse
    {
        try {
            $updated = $this->moderationService->requestChanges(
                $property,
                $request->user(),
                (string) $request->validated('reason')
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'INVALID_STATE_TRANSITION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $updated->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($updated),
            'تم إرسال طلب تعديلات على العقار بنجاح'
        );
    }

    public function reject(ModerationDecisionRequest $request, Property $property): JsonResponse
    {
        try {
            $updated = $this->moderationService->reject(
                $property,
                $request->user(),
                (string) $request->validated('reason')
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'INVALID_STATE_TRANSITION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $updated->load(['user', 'reviewer', 'category', 'location', 'images', 'documents', 'moderationLogs.actor']);

        return ApiResponse::success(
            new AdminPropertyResource($updated),
            'تم رفض العقار بنجاح'
        );
    }

    public function destroy(Property $property): JsonResponse
    {
        $property->delete();

        return ApiResponse::success(null, 'تم حذف العقار بنجاح');
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title, '-', 'ar');
        if ($base === '') {
            $base = 'property';
        }
        $base = Str::limit($base, 180, '');

        do {
            $candidate = $base . '-' . Str::lower(Str::random(6));
        } while (Property::withTrashed()->where('slug', $candidate)->exists());

        return $candidate;
    }
}
