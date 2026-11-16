<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Taxonomy\Models\Location;
use App\Modules\Taxonomy\Requests\StoreLocationRequest;
use App\Modules\Taxonomy\Requests\UpdateLocationRequest;
use App\Modules\Taxonomy\Resources\LocationResource;
use App\Support\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class AdminLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Location::query()
            ->with('parent')
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->has('is_active') && $request->query('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $locations = $query->get();

        return ApiResponse::success(
            LocationResource::collection($locations),
            'تم جلب المواقع بنجاح'
        );
    }

    public function store(StoreLocationRequest $request): JsonResponse
    {
        try {
            $location = Location::create($request->validated());
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'HIERARCHY_VIOLATION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $location->load('parent');

        return ApiResponse::success(
            new LocationResource($location),
            'تم إنشاء الموقع بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function update(UpdateLocationRequest $request, Location $location): JsonResponse
    {
        try {
            $location->fill($request->validated());
            $location->save();
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'HIERARCHY_VIOLATION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $location->load('parent');

        return ApiResponse::success(
            new LocationResource($location),
            'تم تحديث الموقع بنجاح'
        );
    }

    public function destroy(Location $location): JsonResponse
    {
        if ($location->children()->exists() || $location->properties()->withTrashed()->exists()) {
            return ApiResponse::error(
                'لا يمكن حذف الموقع لوجود مواقع فرعية أو عقارات مرتبطة به.',
                'RESOURCE_IN_USE',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        try {
            $location->delete();
        } catch (QueryException) {
            return ApiResponse::error(
                'لا يمكن حذف الموقع لوجود بيانات مرتبطة به.',
                'RESOURCE_IN_USE',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        return ApiResponse::success(null, 'تم حذف الموقع بنجاح');
    }
}
