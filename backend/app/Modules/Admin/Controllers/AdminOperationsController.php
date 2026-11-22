<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Enums\ModerationStatus;
use App\Http\Controllers\Controller;
use App\Modules\Admin\Models\Area;
use App\Modules\Admin\Models\BuyerRequest;
use App\Modules\Admin\Models\PropertyReport;
use App\Modules\Admin\Models\SiteSetting;
use App\Modules\Admin\Services\AdminAuditLogger;
use App\Modules\Company\Models\Company;
use App\Modules\Property\Models\Property;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminOperationsController extends Controller
{
    public function areasIndex(): JsonResponse
    {
        $areas = Area::query()->orderByDesc('search_count')->orderBy('name')->get();

        return ApiResponse::success($areas, 'تم جلب المناطق بنجاح');
    }

    public function areasStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:areas,name'],
            'city' => ['nullable', 'string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $area = Area::query()->create([
            'name' => trim($validated['name']),
            'city' => isset($validated['city']) && trim($validated['city']) !== '' ? trim($validated['city']) : 'سوهاج',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AdminAuditLogger::log($request->user(), 'area.create', 'area', $area->id, $area->toArray());

        return ApiResponse::success($area, 'تم إضافة المنطقة بنجاح', Response::HTTP_CREATED);
    }

    public function areasUpdate(Request $request, Area $area): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120', Rule::unique('areas', 'name')->ignore($area->id)],
            'city' => ['nullable', 'string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $area->fill(array_filter($validated, fn ($v) => $v !== null));
        $area->save();

        AdminAuditLogger::log($request->user(), 'area.update', 'area', $area->id, $validated);

        return ApiResponse::success($area->fresh(), 'تم تحديث المنطقة بنجاح');
    }

    public function areasDestroy(Request $request, Area $area): JsonResponse
    {
        $id = $area->id;
        $name = $area->name;
        $area->delete();

        AdminAuditLogger::log($request->user(), 'area.delete', 'area', $id, ['name' => $name]);

        return ApiResponse::success(null, 'تم حذف المنطقة بنجاح');
    }

    public function reportsIndex(Request $request): JsonResponse
    {
        $query = PropertyReport::query()->with('property:id,title_ar,reference_code,moderation_status');

        if (is_string($status = $request->query('status')) && in_array($status, ['open', 'resolved'], true)) {
            $query->where('status', $status);
        }

        $perPage = max(1, min(50, (int) $request->query('per_page', 15)));
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return ApiResponse::success($paginator->items(), 'تم جلب البلاغات بنجاح', Response::HTTP_OK, [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function reportsUpdate(Request $request, PropertyReport $report): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'resolved'])],
            'reject_property' => ['nullable', 'boolean'],
            'rejection_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $report->status = $validated['status'];
        $report->save();

        if (! empty($validated['reject_property']) && $report->property) {
            $report->property->moderation_status = ModerationStatus::Rejected;
            $report->property->rejection_reason = trim((string) ($validated['rejection_reason'] ?? $report->reason));
            $report->property->reviewed_by = $request->user()->id;
            $report->property->reviewed_at = now();
            $report->property->save();
        }

        AdminAuditLogger::log($request->user(), 'report.update', 'property_report', $report->id, $validated);

        return ApiResponse::success($report->fresh('property:id,title_ar,moderation_status'), 'تم تحديث البلاغ بنجاح');
    }

    public function buyerRequestsIndex(Request $request): JsonResponse
    {
        $query = BuyerRequest::query()->with('assignedCompany:id,name,slug');

        if (is_string($status = $request->query('status')) && in_array($status, ['new', 'assigned', 'closed'], true)) {
            $query->where('status', $status);
        }

        $perPage = max(1, min(50, (int) $request->query('per_page', 15)));
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return ApiResponse::success($paginator->items(), 'تم جلب طلبات المشترين بنجاح', Response::HTTP_OK, [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function buyerRequestsUpdate(Request $request, BuyerRequest $buyerRequest): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['new', 'assigned', 'closed'])],
            'assigned_company_id' => ['nullable', 'integer', 'exists:companies,id'],
        ]);

        if (array_key_exists('assigned_company_id', $validated)) {
            $buyerRequest->assigned_company_id = $validated['assigned_company_id'];
            if (! array_key_exists('status', $validated) && $validated['assigned_company_id'] !== null) {
                $buyerRequest->status = 'assigned';
            }
        }
        if (array_key_exists('status', $validated) && $validated['status'] !== null) {
            $buyerRequest->status = $validated['status'];
        }

        $buyerRequest->save();

        AdminAuditLogger::log($request->user(), 'buyer_request.update', 'buyer_request', $buyerRequest->id, $validated);

        return ApiResponse::success($buyerRequest->fresh('assignedCompany:id,name,slug'), 'تم تحديث طلب المشتري بنجاح');
    }

    public function updateSiteSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'announcement_bar_text' => ['nullable', 'string', 'max:500'],
            'announcement_bar_active' => ['nullable', 'boolean'],
            'hero_banner_title' => ['nullable', 'string', 'max:255'],
            'hero_banner_subtitle' => ['nullable', 'string', 'max:500'],
            'hero_banner_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ]);

        $updates = [];

        foreach (['announcement_bar_text', 'hero_banner_title', 'hero_banner_subtitle'] as $key) {
            if (array_key_exists($key, $validated)) {
                $val = (string) ($validated[$key] ?? '');
                SiteSetting::query()->updateOrCreate(['key' => $key], ['value' => $val]);
                $updates[$key] = $val;
            }
        }

        if (array_key_exists('announcement_bar_active', $validated)) {
            $val = $validated['announcement_bar_active'] ? 'true' : 'false';
            SiteSetting::query()->updateOrCreate(['key' => 'announcement_bar_active'], ['value' => $val]);
            $updates['announcement_bar_active'] = $val;
        }

        if ($request->hasFile('hero_banner_image')) {
            /** @var UploadedFile $file */
            $file = $request->file('hero_banner_image');
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file->getRealPath()) ?: '';
            if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                return ApiResponse::error(
                    'صيغة صورة البانر غير مدعومة. يُسمح فقط بـ JPG أو PNG أو WebP.',
                    'INVALID_IMAGE_MIME',
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }

            $oldPath = SiteSetting::query()->where('key', 'hero_banner_image')->value('value');
            $path = $file->store('site/hero', 'public');
            SiteSetting::query()->updateOrCreate(['key' => 'hero_banner_image'], ['value' => $path]);
            if (
                is_string($oldPath) &&
                $oldPath !== '' &&
                str_starts_with($oldPath, 'site/hero/') &&
                ! str_contains($oldPath, '..')
            ) {
                Storage::disk('public')->delete($oldPath);
            }
            $updates['hero_banner_image'] = $path;
        }

        AdminAuditLogger::log($request->user(), 'site_settings.update', 'site_settings', null, $updates);

        return ApiResponse::success($updates, 'تم تحديث إعدادات الموقع بنجاح');
    }

    public function exportCsv(Request $request, string $type): StreamedResponse|JsonResponse
    {
        if (! in_array($type, ['users', 'companies', 'properties', 'buyer-requests'], true)) {
            return ApiResponse::error('نوع التصدير غير صالح.', 'INVALID_EXPORT_TYPE', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        AdminAuditLogger::log($request->user(), 'export.csv.' . $type, $type, null, null);

        $filename = sprintf('residenza-%s-%s.csv', $type, now()->format('Y-m-d'));

        return response()->streamDownload(function () use ($type): void {
            $out = fopen('php://output', 'wb');
            if ($out === false) {
                return;
            }
            // UTF-8 BOM for Microsoft Excel Arabic support
            fwrite($out, "\xEF\xBB\xBF");

            if ($type === 'users') {
                fputcsv($out, ['ID', 'Name', 'Email', 'Phone', 'Role', 'Account Type', 'Status', 'Last Seen At', 'Created At']);
                User::query()->orderBy('id')->chunk(200, function ($rows) use ($out) {
                    foreach ($rows as $row) {
                        fputcsv($out, $this->sanitizeCsvRow([
                            $row->id,
                            $row->name,
                            $row->email,
                            $row->phone,
                            $row->role?->value ?? $row->role,
                            $row->account_type?->value ?? $row->account_type,
                            $row->status?->value ?? $row->status,
                            $row->last_seen_at?->toIso8601String(),
                            $row->created_at?->toIso8601String(),
                        ]));
                    }
                });
            } elseif ($type === 'companies') {
                fputcsv($out, ['ID', 'Name', 'Slug', 'Address', 'Verified', 'Plan Tier', 'Max Properties', 'Views', 'WhatsApp Clicks', 'Phone Clicks']);
                Company::query()->orderBy('id')->chunk(200, function ($rows) use ($out) {
                    foreach ($rows as $row) {
                        fputcsv($out, $this->sanitizeCsvRow([
                            $row->id,
                            $row->name,
                            $row->slug,
                            $row->address,
                            $row->is_verified ? 'Yes' : 'No',
                            $row->plan_tier ?? 'free',
                            $row->max_properties ?? 5,
                            $row->views_count ?? 0,
                            $row->whatsapp_clicks ?? 0,
                            $row->phone_clicks ?? 0,
                        ]));
                    }
                });
            } elseif ($type === 'properties') {
                fputcsv($out, ['ID', 'Reference Code', 'Title', 'Transaction', 'Price EGP', 'Area Sqm', 'Moderation Status', 'Featured', 'Views', 'WhatsApp Clicks', 'Phone Clicks', 'Created At']);
                Property::query()->orderBy('id')->chunk(200, function ($rows) use ($out) {
                    foreach ($rows as $row) {
                        fputcsv($out, $this->sanitizeCsvRow([
                            $row->id,
                            $row->reference_code,
                            $row->title_ar,
                            $row->transaction_type?->value ?? $row->transaction_type,
                            $row->price_egp,
                            $row->area_sqm,
                            $row->moderation_status?->value ?? $row->moderation_status,
                            $row->is_featured ? 'Yes' : 'No',
                            $row->views_count ?? 0,
                            $row->whatsapp_clicks ?? 0,
                            $row->phone_clicks ?? 0,
                            $row->created_at?->toIso8601String(),
                        ]));
                    }
                });
            } else {
                fputcsv($out, ['ID', 'Name', 'Phone', 'Property Type', 'Area', 'Budget Max', 'Status', 'Assigned Company ID', 'Created At']);
                BuyerRequest::query()->orderBy('id')->chunk(200, function ($rows) use ($out) {
                    foreach ($rows as $row) {
                        fputcsv($out, $this->sanitizeCsvRow([
                            $row->id,
                            $row->name,
                            $row->phone,
                            $row->property_type,
                            $row->area,
                            $row->budget_max,
                            $row->status,
                            $row->assigned_company_id,
                            $row->created_at?->toIso8601String(),
                        ]));
                    }
                });
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Prevent CSV/Excel Formula Injection by prefixing dangerous leading characters.
     *
     * @param  array<int, mixed>  $row
     * @return array<int, string>
     */
    private function sanitizeCsvRow(array $row): array
    {
        return array_map(function (mixed $cell): string {
            if ($cell === null) {
                return '';
            }
            $value = (string) $cell;
            if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value) === 1) {
                return "'" . $value;
            }

            return $value;
        }, $row);
    }
}
