<?php

declare(strict_types=1);

use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->statefulApi();

        $middleware->appendToGroup('api', [
            \App\Http\Middleware\TrackUserActivity::class,
        ]);

        $middleware->redirectGuestsTo(fn (Request $request) => null);

        $middleware->alias([
            'user.active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'user.admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'track.activity' => \App\Http\Middleware\TrackUserActivity::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Force JSON rendering on API requests so HTML error pages are never returned
        $exceptions->shouldRenderJsonWhen(function (Request $request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'بيانات الإدخال غير صالحة',
                    errorCode: 'VALIDATION_ERROR',
                    statusCode: 422,
                    errors: $e->errors()
                );
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'غير مصرح لك بالوصول، يرجى تسجيل الدخول أولاً',
                    errorCode: 'UNAUTHENTICATED',
                    statusCode: 401
                );
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء',
                    errorCode: 'FORBIDDEN',
                    statusCode: 403
                );
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'العنصر المطلوب غير موجود',
                    errorCode: 'NOT_FOUND',
                    statusCode: 404
                );
            }
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'طريقة الطلب غير مدعومة لهذا المسار',
                    errorCode: 'METHOD_NOT_ALLOWED',
                    statusCode: 405
                );
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'تم تجاوز الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً',
                    errorCode: 'TOO_MANY_REQUESTS',
                    statusCode: 429
                );
            }
        });

        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: 'انتهت صلاحية الجلسة، يرجى تحديث الصفحة والمحاولة مرة أخرى',
                    errorCode: 'CSRF_TOKEN_MISMATCH',
                    statusCode: 419
                );
            }
        });

        $exceptions->render(function (HttpResponseException $e, Request $request) {
            return $e->getResponse();
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = $e->getStatusCode();

                if ($status === 419) {
                    return ApiResponse::error(
                        message: 'انتهت صلاحية الجلسة، يرجى تحديث الصفحة والمحاولة مرة أخرى',
                        errorCode: 'CSRF_TOKEN_MISMATCH',
                        statusCode: 419
                    );
                }

                if ($status < 500) {
                    return ApiResponse::error(
                        message: $e->getMessage() ?: (Response::$statusTexts[$status] ?? 'خطأ في معالجة الطلب'),
                        errorCode: 'HTTP_ERROR',
                        statusCode: $status
                    );
                }
            }
        });

        // Catch-all unhandled exceptions on API routes: generic 500 JSON envelope without leaking internal details
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                Log::error('Unhandled API Exception', [
                    'exception' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'url' => $request->fullUrl(),
                ]);

                return ApiResponse::error(
                    message: 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً',
                    errorCode: 'INTERNAL_SERVER_ERROR',
                    statusCode: 500
                );
            }
        });
    })->create();
