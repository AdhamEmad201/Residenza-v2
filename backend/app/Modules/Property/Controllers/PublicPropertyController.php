<?php

declare(strict_types=1);

namespace App\Modules\Property\Controllers;

use App\Enums\FinishingType;
use App\Enums\PaymentMethod;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Resources\PublicPropertyResource;
use App\Modules\Taxonomy\Models\Category;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicPropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->publicMarketplace()
            ->with(['category', 'location', 'images', 'user']);

        if (is_string($tx = $request->query('transaction_type')) && TransactionType::tryFrom($tx) !== null) {
            $query->where('transaction_type', $tx);
        }

        if (is_string($propType = $request->query('property_type')) && PropertyType::tryFrom($propType) !== null) {
            $query->whereHas('category', fn (Builder $q) => $q->where('property_type', $propType));
        }

        if (is_numeric($catId = $request->query('category_id'))) {
            $categoryIds = Category::query()
                ->where('id', (int) $catId)
                ->orWhere('parent_id', (int) $catId)
                ->pluck('id');

            $query->whereIn('category_id', $categoryIds->isEmpty() ? [-1] : $categoryIds);
        }

        if (is_numeric($locId = $request->query('location_id'))) {
            $locationIds = $this->resolveLocationSubtreeIds((int) $locId);
            $query->whereIn('location_id', $locationIds === [] ? [-1] : $locationIds);
        }

        if (is_string($pm = $request->query('payment_method')) && PaymentMethod::tryFrom($pm) !== null) {
            $query->where('payment_method', $pm);
        }

        if (is_numeric($minPrice = $request->query('min_price'))) {
            $query->where('price_egp', '>=', (float) $minPrice);
        }

        if (is_numeric($maxPrice = $request->query('max_price'))) {
            $query->where('price_egp', '<=', (float) $maxPrice);
        }

        if (is_numeric($minArea = $request->query('min_area'))) {
            $query->where('area_sqm', '>=', (float) $minArea);
        }

        if (is_numeric($maxArea = $request->query('max_area'))) {
            $query->where('area_sqm', '<=', (float) $maxArea);
        }

        if (is_numeric($bedrooms = $request->query('bedrooms'))) {
            $query->where('bedrooms', (int) $bedrooms);
        }

        if (is_numeric($bathrooms = $request->query('bathrooms'))) {
            $query->where('bathrooms', (int) $bathrooms);
        }

        if (is_string($finishing = $request->query('finishing_type')) && FinishingType::tryFrom($finishing) !== null) {
            $query->where('finishing_type', $finishing);
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

        $sort = $request->query('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('price_egp', 'asc')->orderByDesc('id'),
            'price_desc' => $query->orderByDesc('price_egp')->orderByDesc('id'),
            'area_desc' => $query->orderByDesc('area_sqm')->orderByDesc('id'),
            default => $query->orderByDesc('is_featured')->orderByDesc('published_at')->orderByDesc('id'),
        };

        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(1, min(50, $perPage));

        $paginator = $query->paginate($perPage);

        return ApiResponse::success(
            PublicPropertyResource::collection($paginator->items()),
            'تم جلب العقارات بنجاح',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        );
    }

    public function show(string $slug): JsonResponse
    {
        $property = Property::query()
            ->publicMarketplace()
            ->with(['category', 'location', 'images', 'user'])
            ->where('slug', $slug)
            ->firstOrFail();

        return ApiResponse::success(
            new PublicPropertyResource($property),
            'تم جلب تفاصيل العقار بنجاح'
        );
    }

    /**
     * @return array<int, int>
     */
    private function resolveLocationSubtreeIds(int $rootId): array
    {
        $rows = DB::select(
            'WITH RECURSIVE descendants(id) AS (
                SELECT id FROM locations WHERE id = ?
                UNION ALL
                SELECT l.id FROM locations l JOIN descendants d ON l.parent_id = d.id
            )
            SELECT id FROM descendants',
            [$rootId]
        );

        return array_map(static fn (object $row): int => (int) $row->id, $rows);
    }
}
