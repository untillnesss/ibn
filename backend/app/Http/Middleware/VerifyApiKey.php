<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyApiKey
{
    /**
     * Handle an incoming request.
     *
     * Verifies a shared-secret API key header, then checks the request's
     * Origin/Referer host against an allowlist. Both checks are simple
     * abuse-deterrence (this app has no real authentication anywhere),
     * not access control for sensitive data.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $providedKey = $request->header('X-API-Key');

        if (! $providedKey || ! hash_equals((string) config('services.upload.api_key'), (string) $providedKey)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $allowedHosts = array_filter(array_map(
            fn (string $origin) => parse_url(trim($origin), PHP_URL_HOST) ?: trim($origin),
            explode(',', (string) config('services.upload.allowed_origins')),
        ));

        if ($allowedHosts !== []) {
            $origin = $request->headers->get('Origin') ?? $request->headers->get('Referer');
            $host = $origin ? parse_url($origin, PHP_URL_HOST) : null;

            if (! $host || ! in_array($host, $allowedHosts, true)) {
                return response()->json(['message' => 'Forbidden domain'], 403);
            }
        }

        return $next($request);
    }
}
