<?php

declare(strict_types=1);

use App\Support\ApiResponse;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Media\Controllers\DocumentDownloadController;
use App\Modules\Media\Controllers\PropertyMediaController;
use App\Modules\Moderation\Controllers\AdminDashboardController;
use App\Modules\Moderation\Controllers\AdminPropertyController;
use App\Modules\Property\Controllers\PortalPropertyController;
use App\Modules\Property\Controllers\PublicPropertyController;
use App\Modules\Taxonomy\Controllers\AdminCategoryController;
use App\Modules\Taxonomy\Controllers\AdminLocationController;
use App\Modules\Taxonomy\Controllers\TaxonomyController;
use App\Modules\User\Controllers\AdminUserController;
use App\Modules\User\Controllers\ProfileController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        try {
            DB::select('SELECT 1');

            return ApiResponse::success([
                'service' => 'RESIDENZA API',
                'version' => 'v1',
                'status' => 'ok',
                'database' => 'connected',
                'timestamp' => now()->toIso8601String(),
            ], 'RESIDENZA API يعمل بنجاح');
        } catch (\Throwable $e) {
            Log::error('Health check database connection failure', [
                'error' => $e->getMessage(),
            ]);

            return ApiResponse::error(
                message: 'فشل الاتصال بقاعدة البيانات',
                errorCode: 'DATABASE_ERROR',
                statusCode: 503
            );
        }
    });

    // Public authentication routes (rate-limited to 10 requests per minute)
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

        // Authenticated auth routes
        Route::middleware(['auth:sanctum', 'user.active'])->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    // Public taxonomy & marketplace routes (rate-limited to 60 requests per minute)
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/categories', [TaxonomyController::class, 'categories']);
        Route::get('/locations', [TaxonomyController::class, 'locations']);
        Route::get('/properties', [PublicPropertyController::class, 'index']);
        Route::get('/properties/{slug}', [PublicPropertyController::class, 'show']);
    });

    // Authenticated user portal routes
    Route::middleware(['auth:sanctum', 'user.active'])->prefix('portal')->group(function () {
        Route::put('/profile', [ProfileController::class, 'update']);

        Route::get('/properties', [PortalPropertyController::class, 'index']);
        Route::post('/properties', [PortalPropertyController::class, 'store']);
        Route::get('/properties/{property}', [PortalPropertyController::class, 'show']);
        Route::put('/properties/{property}', [PortalPropertyController::class, 'update']);
        Route::patch('/properties/{property}', [PortalPropertyController::class, 'update']);
        Route::post('/properties/{property}/submit', [PortalPropertyController::class, 'submit']);
        Route::post('/properties/{property}/resubmit', [PortalPropertyController::class, 'resubmit']);
        Route::patch('/properties/{property}/availability', [PortalPropertyController::class, 'updateAvailability']);
        Route::delete('/properties/{property}', [PortalPropertyController::class, 'destroy']);

        Route::post('/properties/{property}/images', [PropertyMediaController::class, 'uploadImages'])
            ->middleware('throttle:20,1');
        Route::patch('/properties/{property}/images/{image}/primary', [PropertyMediaController::class, 'setPrimaryImage']);
        Route::delete('/properties/{property}/images/{image}', [PropertyMediaController::class, 'deleteImage']);
        Route::post('/properties/{property}/documents', [PropertyMediaController::class, 'uploadDocument'])
            ->middleware('throttle:20,1');
        Route::delete('/properties/{property}/documents/{document}', [PropertyMediaController::class, 'deleteDocument']);
    });

    // Private document download streaming (owner or active admin)
    Route::middleware(['auth:sanctum', 'user.active'])
        ->get('/documents/{document}/download', DocumentDownloadController::class);

    // Admin routes
    Route::middleware(['auth:sanctum', 'user.active', 'user.admin'])->prefix('admin')->group(function () {
        Route::get('/ping', function () {
            return ApiResponse::success(['admin' => true], 'مرحباً بك في لوحة الإدارة');
        });

        Route::get('/dashboard', [AdminDashboardController::class, 'index']);

        Route::get('/properties', [AdminPropertyController::class, 'index']);
        Route::post('/properties', [AdminPropertyController::class, 'store']);
        Route::get('/properties/{property}', [AdminPropertyController::class, 'show']);
        Route::patch('/properties/{property}', [AdminPropertyController::class, 'update']);
        Route::post('/properties/{property}/approve', [AdminPropertyController::class, 'approve']);
        Route::post('/properties/{property}/request-changes', [AdminPropertyController::class, 'requestChanges']);
        Route::post('/properties/{property}/reject', [AdminPropertyController::class, 'reject']);
        Route::delete('/properties/{property}', [AdminPropertyController::class, 'destroy']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus']);

        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::put('/categories/{category}', [AdminCategoryController::class, 'update']);
        Route::patch('/categories/{category}', [AdminCategoryController::class, 'update']);
        Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy']);

        Route::get('/locations', [AdminLocationController::class, 'index']);
        Route::post('/locations', [AdminLocationController::class, 'store']);
        Route::put('/locations/{location}', [AdminLocationController::class, 'update']);
        Route::patch('/locations/{location}', [AdminLocationController::class, 'update']);
        Route::delete('/locations/{location}', [AdminLocationController::class, 'destroy']);
    });
});
