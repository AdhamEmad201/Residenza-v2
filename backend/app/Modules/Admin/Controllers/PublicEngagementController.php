<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Models\Area;
use App\Modules\Admin\Models\BuyerRequest;
use App\Modules\Admin\Models\PropertyReport;
use App\Modules\Admin\Models\SiteSetting;
use App\Modules\Company\Models\Company;
use App\Modules\Property\Models\Property;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class PublicEngagementController extends Controller
{
    public function trackClick(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['whatsapp', 'phone', 'view'])],
            'target_type' => ['required', Rule::in(['property', 'company'])],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        $column = match ($validated['type']) {
            'whatsapp' => 'whatsapp_clicks',
            'phone' => 'phone_clicks',
            'view' => 'views_count',
        };

        $modelClass = $validated['target_type'] === 'property' ? Property::class : Company::class;
        $updated = $modelClass::query()
            ->where('id', (int) $validated['id'])
            ->increment($column);

        if ($updated === 0) {
            return ApiResponse::error('العنصر المطلوب غير موجود.', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        return ApiResponse::success([
            'tracked' => true,
            'type' => $validated['type'],
            'target_type' => $validated['target_type'],
            'id' => (int) $validated['id'],
        ], 'تم تسجيل التفاعل بنجاح');
    }

    public function reportProperty(Request $request, int $id): JsonResponse
    {
        $property = Property::query()->find($id);
        if (! $property) {
            return ApiResponse::error('العقار غير موجود.', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'reporter_phone' => ['nullable', 'string', 'max:40'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = PropertyReport::query()->create([
            'property_id' => $property->id,
            'reporter_phone' => $validated['reporter_phone'] ?? null,
            'reason' => trim($validated['reason']),
            'notes' => isset($validated['notes']) ? trim($validated['notes']) : null,
            'status' => 'open',
        ]);

        return ApiResponse::success(
            $report,
            'تم إرسال البلاغ بنجاح وستقوم الإدارة بمراجعته.',
            Response::HTTP_CREATED
        );
    }

    public function storeBuyerRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'min:7', 'max:40'],
            'property_type' => ['required', 'string', 'max:100'],
            'area' => ['required', 'string', 'max:120'],
            'budget_max' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $buyerRequest = BuyerRequest::query()->create([
            'name' => trim($validated['name']),
            'phone' => trim($validated['phone']),
            'property_type' => trim($validated['property_type']),
            'area' => trim($validated['area']),
            'budget_max' => $validated['budget_max'] ?? null,
            'notes' => isset($validated['notes']) ? trim($validated['notes']) : null,
            'status' => 'new',
        ]);

        Area::query()
            ->where('name', trim($validated['area']))
            ->increment('search_count');

        return ApiResponse::success(
            $buyerRequest,
            'تم تسجيل طلبك العقاري بنجاح، وسيتواصل معك فريق ريزيدنزا قريباً.',
            Response::HTTP_CREATED
        );
    }

    public function siteConfig(): JsonResponse
    {
        $areas = Area::query()
            ->where('is_active', true)
            ->orderByDesc('search_count')
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'search_count']);

        $settings = SiteSetting::query()
            ->whereIn('key', [
                'announcement_bar_text',
                'announcement_bar_active',
                'hero_banner_title',
                'hero_banner_subtitle',
                'hero_banner_image',
            ])
            ->pluck('value', 'key');

        $heroImage = $settings->get('hero_banner_image');
        $heroImageUrl = null;
        if (is_string($heroImage) && $heroImage !== '') {
            $heroImageUrl = str_starts_with($heroImage, 'http')
                ? $heroImage
                : Storage::disk('public')->url($heroImage);
        }

        return ApiResponse::success([
            'areas' => $areas,
            'announcement_bar' => [
                'text' => $settings->get('announcement_bar_text', ''),
                'active' => filter_var($settings->get('announcement_bar_active', 'false'), FILTER_VALIDATE_BOOLEAN),
            ],
            'hero_banner' => [
                'title' => $settings->get('hero_banner_title', ''),
                'subtitle' => $settings->get('hero_banner_subtitle', ''),
                'image' => $heroImage,
                'image_url' => $heroImageUrl,
            ],
        ], 'تم جلب إعدادات المنصة بنجاح');
    }
}
