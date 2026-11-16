<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Controllers;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Moderation\Models\ModerationLog;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $moderationCounts = Property::query()
            ->selectRaw('moderation_status, COUNT(*) as total')
            ->groupBy('moderation_status')
            ->pluck('total', 'moderation_status');

        $availabilityCounts = Property::query()
            ->selectRaw('availability_status, COUNT(*) as total')
            ->groupBy('availability_status')
            ->pluck('total', 'availability_status');

        $recentLogs = ModerationLog::query()
            ->with(['actor:id,name', 'property:id,reference_code,title_ar'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (ModerationLog $log) => [
                'id' => $log->id,
                'property_id' => $log->property_id,
                'property_reference' => $log->property?->reference_code,
                'property_title' => $log->property?->title_ar,
                'actor_id' => $log->actor_id,
                'actor_name' => $log->actor?->name,
                'from_status' => $log->from_status?->value ?? $log->from_status,
                'to_status' => $log->to_status?->value ?? $log->to_status,
                'action' => $log->action,
                'notes' => $log->notes,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return ApiResponse::success([
            'properties' => [
                'total' => Property::query()->count(),
                'by_moderation_status' => [
                    'draft' => (int) ($moderationCounts[ModerationStatus::Draft->value] ?? 0),
                    'pending_review' => (int) ($moderationCounts[ModerationStatus::PendingReview->value] ?? 0),
                    'changes_requested' => (int) ($moderationCounts[ModerationStatus::ChangesRequested->value] ?? 0),
                    'approved' => (int) ($moderationCounts[ModerationStatus::Approved->value] ?? 0),
                    'rejected' => (int) ($moderationCounts[ModerationStatus::Rejected->value] ?? 0),
                ],
                'by_availability_status' => [
                    'available' => (int) ($availabilityCounts[AvailabilityStatus::Available->value] ?? 0),
                    'sold' => (int) ($availabilityCounts[AvailabilityStatus::Sold->value] ?? 0),
                    'rented' => (int) ($availabilityCounts[AvailabilityStatus::Rented->value] ?? 0),
                    'hidden' => (int) ($availabilityCounts[AvailabilityStatus::Hidden->value] ?? 0),
                ],
            ],
            'users' => [
                'total' => User::query()->count(),
                'active' => User::query()->where('status', UserStatus::Active->value)->count(),
                'suspended' => User::query()->where('status', UserStatus::Suspended->value)->count(),
            ],
            'taxonomy' => [
                'categories' => Category::query()->count(),
                'locations' => Location::query()->count(),
            ],
            'recent_moderation_logs' => $recentLogs,
        ], 'تم جلب إحصائيات لوحة الإدارة بنجاح');
    }
}
