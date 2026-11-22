<?php

declare(strict_types=1);

namespace App\Modules\Company\Controllers;

use App\Enums\TransactionType;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Modules\Company\Models\Company;
use App\Modules\Company\Resources\CompanyResource;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Resources\PublicPropertyResource;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->whereHas('user', fn (Builder $u) => $u->where('status', UserStatus::Active->value))
            ->withCount([
                'properties' => fn (Builder $p) => $p->publicMarketplace(),
            ]);

        if ($request->boolean('verified')) {
            $query->where('is_verified', true);
        }

        if (is_string($search = $request->query('q')) && trim($search) !== '') {
            $escaped = addcslashes(trim($search), '%_\\');
            $like = "%{$escaped}%";
            $query->where(function (Builder $q) use ($like) {
                $q->where('name', 'LIKE', $like)
                    ->orWhere('address', 'LIKE', $like)
                    ->orWhere('bio', 'LIKE', $like);
            });
        }

        $query->orderByDesc('is_verified')
            ->orderByDesc('properties_count')
            ->orderByDesc('id');

        $perPage = max(1, min(50, (int) $request->query('per_page', 12)));
        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            CompanyResource::collection($paginator->items()),
            'تم جلب الشركات والوكالات العقارية بنجاح',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $company = Company::query()
            ->where('slug', $slug)
            ->whereHas('user', fn (Builder $u) => $u->where('status', UserStatus::Active->value))
            ->with('projects')
            ->withCount([
                'properties' => fn (Builder $p) => $p->publicMarketplace(),
            ])
            ->firstOrFail();

        $propertiesQuery = Property::query()
            ->publicMarketplace()
            ->where('company_id', $company->id)
            ->with([
                'category',
                'location',
                'images',
                'user',
                'company:id,name,slug,logo_path,is_verified,accent_color',
                'project:id,name,slug',
            ]);

        if (is_string($tx = $request->query('transaction_type')) && TransactionType::tryFrom($tx) !== null) {
            $propertiesQuery->where('transaction_type', $tx);
        }

        if (is_numeric($projectId = $request->query('project_id'))) {
            $propertiesQuery->where('project_id', (int) $projectId);
        }

        if (is_string($search = $request->query('q')) && trim($search) !== '') {
            $escaped = addcslashes(trim($search), '%_\\');
            $like = "%{$escaped}%";
            $propertiesQuery->where(function (Builder $q) use ($like) {
                $q->where('title_ar', 'LIKE', $like)
                    ->orWhere('address_details_ar', 'LIKE', $like)
                    ->orWhere('reference_code', 'LIKE', $like);
            });
        }

        $sort = $request->query('sort', 'newest');
        match ($sort) {
            'price_asc' => $propertiesQuery->orderBy('price_egp', 'asc')->orderByDesc('id'),
            'price_desc' => $propertiesQuery->orderByDesc('price_egp')->orderByDesc('id'),
            'area_desc' => $propertiesQuery->orderByDesc('area_sqm')->orderByDesc('id'),
            default => $propertiesQuery->orderByDesc('is_featured')->orderByDesc('published_at')->orderByDesc('id'),
        };

        $perPage = max(1, min(50, (int) $request->query('per_page', 12)));
        $paginator = $propertiesQuery->paginate($perPage);

        return ApiResponse::success([
            'company' => new CompanyResource($company),
            'properties' => PublicPropertyResource::collection($paginator->items()),
            'properties_meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ], 'تم جلب واجهة الشركة العقارية بنجاح');
    }
}
