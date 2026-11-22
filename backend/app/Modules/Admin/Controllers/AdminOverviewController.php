<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Admin\Models\AdminAuditLog;
use App\Modules\Admin\Models\Area;
use App\Modules\Admin\Models\BuyerRequest;
use App\Modules\Admin\Models\PropertyReport;
use App\Modules\Company\Models\Company;
use App\Modules\Property\Models\Property;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOverviewController extends Controller
{
    public function overview(): JsonResponse
    {
        $onlineThreshold = now()->subMinutes(5);
        $staleThreshold = now()->subDays(45);

        $onlineUsers = User::query()
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '>=', $onlineThreshold)
            ->orderByDesc('last_seen_at')
            ->limit(25)
            ->get(['id', 'name', 'email', 'role', 'account_type', 'last_seen_at']);

        $totalUsers = User::query()->count();

        $pendingCount = Property::query()
            ->whereIn('moderation_status', [ModerationStatus::PendingReview->value, 'pending'])
            ->count();

        $approvedCount = Property::query()
            ->where('moderation_status', ModerationStatus::Approved->value)
            ->count();

        $rejectedCount = Property::query()
            ->where('moderation_status', ModerationStatus::Rejected->value)
            ->count();

        $staleCount = Property::query()
            ->where('moderation_status', ModerationStatus::Approved->value)
            ->where('availability_status', AvailabilityStatus::Available->value)
            ->where('created_at', '<=', $staleThreshold)
            ->count();

        $totalCompanies = Company::query()->count();
        $verifiedCompanies = Company::query()->where('is_verified', true)->count();

        $propWhatsapp = (int) Property::query()->sum('whatsapp_clicks');
        $compWhatsapp = (int) Company::query()->sum('whatsapp_clicks');
        $propPhone = (int) Property::query()->sum('phone_clicks');
        $compPhone = (int) Company::query()->sum('phone_clicks');
        $propViews = (int) Property::query()->sum('views_count');
        $compViews = (int) Company::query()->sum('views_count');

        $topAreas = Area::query()
            ->where('is_active', true)
            ->orderByDesc('search_count')
            ->orderBy('name')
            ->limit(5)
            ->get(['id', 'name', 'city', 'search_count']);

        $openReportsCount = PropertyReport::query()->where('status', 'open')->count();
        $newBuyerRequestsCount = BuyerRequest::query()->where('status', 'new')->count();

        return ApiResponse::success([
            'total_users' => $totalUsers,
            'online_users_count' => $onlineUsers->count(),
            'online_users' => $onlineUsers,
            'properties' => [
                'total' => Property::query()->count(),
                'pending' => $pendingCount,
                'approved' => $approvedCount,
                'rejected' => $rejectedCount,
                'stale' => $staleCount,
            ],
            'companies' => [
                'total' => $totalCompanies,
                'verified' => $verifiedCompanies,
            ],
            'engagement' => [
                'total_whatsapp_clicks' => $propWhatsapp + $compWhatsapp,
                'total_phone_clicks' => $propPhone + $compPhone,
                'total_views' => $propViews + $compViews,
            ],
            'top_areas' => $topAreas,
            'open_reports_count' => $openReportsCount,
            'new_buyer_requests_count' => $newBuyerRequestsCount,
        ], 'تم جلب إحصائيات غرفة التحكم بنجاح');
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $perPage = max(1, min(50, (int) $request->query('per_page', 20)));

        $paginator = AdminAuditLog::query()
            ->with('admin:id,name,email')
            ->orderByDesc('id')
            ->paginate($perPage);

        return ApiResponse::success(
            $paginator->items(),
            'تم جلب سجل تدقيق الإدارة بنجاح',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }
}
