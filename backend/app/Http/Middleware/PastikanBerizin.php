<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menjaga rute yang tidak punya model untuk digantungi Policy.
 *
 * Ringkasan, monitoring, pengingat, dan export tidak beroperasi pada satu
 * baris tertentu, sehingga tidak ada model yang dapat diserahkan ke
 * `authorize()`. Tanpa middleware ini pemeriksaannya akan ditulis ulang di
 * dalam tiap controller — dan yang ditulis berulang cepat atau lambat berbeda
 * di salah satunya.
 */
class PastikanBerizin
{
    public function handle(Request $request, Closure $next, string ...$izin): Response
    {
        $pengguna = $request->user();

        if ($pengguna === null || ! $pengguna->bolehSalahSatu($izin)) {
            return ApiResponse::error('Anda tidak memiliki akses ke data ini.', 403);
        }

        return $next($request);
    }
}
