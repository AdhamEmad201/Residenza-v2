<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Requests\StoreCategoryRequest;
use App\Modules\Taxonomy\Requests\UpdateCategoryRequest;
use App\Modules\Taxonomy\Resources\CategoryResource;
use App\Support\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class AdminCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::query()
            ->with('parent')
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->has('is_active') && $request->query('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $categories = $query->get();

        return ApiResponse::success(
            CategoryResource::collection($categories),
            'تم جلب التصنيفات بنجاح'
        );
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        try {
            $category = Category::create($request->validated());
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'HIERARCHY_VIOLATION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $category->load('parent');

        return ApiResponse::success(
            new CategoryResource($category),
            'تم إنشاء التصنيف بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        try {
            $category->fill($request->validated());
            $category->save();
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error(
                $e->getMessage(),
                'HIERARCHY_VIOLATION',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $category->load('parent');

        return ApiResponse::success(
            new CategoryResource($category),
            'تم تحديث التصنيف بنجاح'
        );
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->children()->exists() || $category->properties()->withTrashed()->exists()) {
            return ApiResponse::error(
                'لا يمكن حذف التصنيف لوجود تصنيفات فرعية أو عقارات مرتبطة به.',
                'RESOURCE_IN_USE',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        try {
            $category->delete();
        } catch (QueryException) {
            return ApiResponse::error(
                'لا يمكن حذف التصنيف لوجود بيانات مرتبطة به.',
                'RESOURCE_IN_USE',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        return ApiResponse::success(null, 'تم حذف التصنيف بنجاح');
    }
}
