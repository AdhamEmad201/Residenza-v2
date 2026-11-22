<?php

declare(strict_types=1);

namespace App\Modules\Property\Controllers;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Http\Controllers\Controller;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Requests\StorePropertyRequest;
use App\Modules\Property\Requests\UpdateAvailabilityRequest;
use App\Modules\Property\Requests\UpdatePropertyRequest;
use App\Modules\Property\Resources\PortalPropertyResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class PortalPropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->where('user_id', $request->user()->id)
            ->with(['category', 'location', 'images', 'documents']);

        if (is_string($modStatus = $request->query('moderation_status')) && ModerationStatus::tryFrom($modStatus) !== null) {
            $query->where('moderation_status', $modStatus);
        }

        if (is_string($availStatus = $request->query('availability_status')) && AvailabilityStatus::tryFrom($availStatus) !== null) {
            $query->where('availability_status', $availStatus);
        }

        $query->orderByDesc('created_at')->orderByDesc('id');

        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min(50, $perPage));

        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            PortalPropertyResource::collection($paginator->items()),
            'تم جلب عقاراتك بنجاح',
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
        $user = $request->user();
        $data = $request->validated();
        $shouldSubmit = (bool) ($data['submit'] ?? true);
        unset($data['submit']);

        $company = $user->company()->first();
        if ($company) {
            if (! $user->isAdmin()) {
                $maxProperties = max(0, (int) ($company->max_properties ?? 5));
                $currentCount = Property::query()->where('company_id', $company->id)->count();
                if ($currentCount >= $maxProperties) {
                    return ApiResponse::error(
                        "تم الوصول للحد الأقصى للعقارات المسموح بها في باقتك الحالية ({$maxProperties} عقارات). يرجى ترقية الباقة أو التواصل مع الإدارة.",
                        'COMPANY_PROPERTY_QUOTA_EXCEEDED',
                        Response::HTTP_FORBIDDEN
                    );
                }
            }
            $data['company_id'] = $company->id;
        }
        if (isset($data['project_id'])) {
            $ownsProject = $company !== null && $company->projects()->where('id', (int) $data['project_id'])->exists();
            if (! $ownsProject) {
                return ApiResponse::error(
                    'المشروع المحدد لا ينتمي إلى شركتك.',
                    'INVALID_PROJECT_OWNERSHIP',
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }
        }

        $data['contact_phone'] = $data['contact_phone'] ?? $user->phone;
        $data['contact_whatsapp'] = $data['contact_whatsapp'] ?? ($user->whatsapp_number ?: $user->phone);
        $data['slug'] = $this->generateUniqueSlug((string) $data['title_ar']);

        $property = $shouldSubmit
            ? Property::submitNew($data, $user)
            : Property::createDraft($data, $user);

        $property->load(['category', 'location', 'images', 'documents', 'moderationLogs']);

        return ApiResponse::success(
            new PortalPropertyResource($property),
            $shouldSubmit ? 'تم إرسال العقار للمراجعة بنجاح' : 'تم حفظ مسودة العقار بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function show(Property $property): JsonResponse
    {
        Gate::authorize('view', $property);

        $property->load(['category', 'location', 'images', 'documents', 'moderationLogs']);

        return ApiResponse::success(
            new PortalPropertyResource($property),
            'تم جلب بيانات العقار بنجاح'
        );
    }

    public function update(UpdatePropertyRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('update', $property);

        $user = $request->user();
        $data = $request->validated();
        $company = $user->company()->first();
        if ($company) {
            if (! $user->isAdmin()) {
                $maxProperties = max(0, (int) ($company->max_properties ?? 5));
                $currentCount = Property::query()->where('company_id', $company->id)->count();
                if ($currentCount >= $maxProperties) {
                    return ApiResponse::error(
                        "تم الوصول للحد الأقصى للعقارات المسموح بها في باقتك الحالية ({$maxProperties} عقارات). يرجى ترقية الباقة أو التواصل مع الإدارة.",
                        'COMPANY_PROPERTY_QUOTA_EXCEEDED',
                        Response::HTTP_FORBIDDEN
                    );
                }
            }
            $data['company_id'] = $company->id;
        }
        if (array_key_exists('project_id', $data) && $data['project_id'] !== null) {
            $ownsProject = $company !== null && $company->projects()->where('id', (int) $data['project_id'])->exists();
            if (! $ownsProject) {
                return ApiResponse::error(
                    'المشروع المحدد لا ينتمي إلى شركتك.',
                    'INVALID_PROJECT_OWNERSHIP',
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }
        }

        $updated = $property->updateByOwner($data, $user);
        $updated->load(['category', 'location', 'images', 'documents', 'moderationLogs']);

        return ApiResponse::success(
            new PortalPropertyResource($updated),
            'تم تحديث بيانات العقار بنجاح'
        );
    }

    public function submit(Request $request, Property $property): JsonResponse
    {
        Gate::authorize('submit', $property);

        try {
            $updated = $property->submitDraft($request->user());
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'INVALID_STATE_TRANSITION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $updated->load(['category', 'location', 'images', 'documents', 'moderationLogs']);

        return ApiResponse::success(
            new PortalPropertyResource($updated),
            'تم إرسال العقار للمراجعة بنجاح'
        );
    }

    public function resubmit(Request $request, Property $property): JsonResponse
    {
        Gate::authorize('resubmit', $property);

        $notes = is_string($request->input('notes')) ? $request->input('notes') : null;

        try {
            $updated = $property->resubmit($request->user(), $notes);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'INVALID_STATE_TRANSITION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $updated->load(['category', 'location', 'images', 'documents', 'moderationLogs']);

        return ApiResponse::success(
            new PortalPropertyResource($updated),
            'تم إعادة إرسال العقار للمراجعة بنجاح'
        );
    }

    public function updateAvailability(UpdateAvailabilityRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('updateAvailability', $property);

        $status = AvailabilityStatus::from((string) $request->validated('availability_status'));
        $updated = $property->setAvailability($status, $request->user());
        $updated->load(['category', 'location', 'images', 'documents']);

        return ApiResponse::success(
            new PortalPropertyResource($updated),
            'تم تحديث حالة توفر العقار بنجاح'
        );
    }

    public function destroy(Property $property): JsonResponse
    {
        Gate::authorize('delete', $property);

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
