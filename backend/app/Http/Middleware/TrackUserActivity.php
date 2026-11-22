<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackUserActivity
{
    /**
     * Update authenticated user's last_seen_at only when null or older than 2 minutes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $now = now();
            if ($user->last_seen_at === null || $user->last_seen_at->lt($now->copy()->subMinutes(2))) {
                $user->forceFill(['last_seen_at' => $now])->saveQuietly();
            }
        }

        return $next($request);
    }
}
