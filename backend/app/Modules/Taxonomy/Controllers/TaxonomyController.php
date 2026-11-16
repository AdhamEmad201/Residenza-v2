<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Controllers;

use App\Enums\LocationType;
use App\Enums\PropertyType;
use App\Http\Controllers\Controller;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use App\Modules\Taxonomy\Resources\CategoryResource;
use App\Modules\Taxonomy\Resources\LocationResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxonomyController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $propertyType = $request->query('property_type');
        $isFlat = $request->boolean('flat');

        $query = Category::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');

        if (is_string($propertyType) && PropertyType::tryFrom($propertyType) !== null) {
            $query->where('property_type', $propertyType);
        }

        if ($isFlat) {
            $categories = $query->get();

            return ApiResponse::success(
                CategoryResource::collection($categories),
                'تم جلب التصنيفات بنجاح'
            );
        }

        $categories = $query
            ->whereNull('parent_id')
            ->with(['children' => function ($q) {
                $q->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('id');
            }])
            ->get();

        return ApiResponse::success(
            CategoryResource::collection($categories),
            'تم جلب التصنيفات بنجاح'
        );
    }

    public function locations(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $parentId = $request->query('parent_id');
        $isFlat = $request->boolean('flat');

        $query = Location::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');

        $hasFilter = false;

        if (is_string($type) && LocationType::tryFrom($type) !== null) {
            $query->where('type', $type);
            $hasFilter = true;
        }

        if ($parentId !== null && $parentId !== '' && is_numeric($parentId)) {
            $query->where('parent_id', (int) $parentId);
            $hasFilter = true;
        }

        $locations = $query->get();

        if ($isFlat || $hasFilter) {
            return ApiResponse::success(
                LocationResource::collection($locations),
                'تم جلب المواقع بنجاح'
            );
        }

        // Build nested tree from all active locations in a single query
        $grouped = $locations->groupBy(fn (Location $loc) => $loc->parent_id ?? 0);

        $attachChildren = function (Location $node) use (&$attachChildren, $grouped): void {
            $children = $grouped->get($node->id, collect());
            $children->each($attachChildren);
            $node->setRelation('children', $children->values());
        };

        $roots = $grouped->get(0, collect());
        $roots->each($attachChildren);

        return ApiResponse::success(
            LocationResource::collection($roots->values()),
            'تم جلب المواقع بنجاح'
        );
    }
}
