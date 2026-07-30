<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menolak permintaan dari akun yang sudah dinonaktifkan.
 *
 * Menonaktifkan user di antarmuka tidak serta-merta membatalkan token yang
 * sudah terlanjur dipegang. Middleware ini menutup celah tersebut pada tiap
 * permintaan, lalu mencabut token yang bersangkutan.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            $user->tokens()->delete();

            return ApiResponse::error(
                'Akun Anda tidak aktif. Hubungi administrator.',
                403,
            );
        }

        return $next($request);
    }
}
