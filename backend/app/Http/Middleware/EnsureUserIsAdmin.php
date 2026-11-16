<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return ApiResponse::error(
                message: 'ليس لديك الصلاحية للوصول إلى لوحة الإدارة.',
                errorCode: 'FORBIDDEN',
                statusCode: Response::HTTP_FORBIDDEN
            );
        }

        return $next($request);
    }
}
