<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Support\ApiResponse;
use App\Support\KatalogIzin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Menahan seluruh permintaan saat mode pemeliharaan aktif — kecuali dari yang
 * berizin `sistem.maintenance` (administrator), yang tetap dapat memakai
 * aplikasi untuk memverifikasi dan mematikan modenya.
 *
 * Dipasang di dalam grup `auth:sanctum` supaya penggunanya sudah dikenali,
 * dan /login berada di luar grup itu — jadi administrator tetap bisa masuk saat
 * mode aktif. Balasannya 503 dengan penanda `pemeliharaan` agar frontend dapat
 * mengalihkan ke halaman pemeliharaan alih-alih memperlakukannya sebagai galat.
 */
class ModePemeliharaan
{
    public function handle(Request $request, Closure $next): Response
    {
        /*
         * Fail-open: bila statusnya tak terbaca (mis. tabel `app_settings` belum
         * ada pada jendela sempit antara rilis kode dan migration, atau gangguan
         * DB), permintaan DILOLOSKAN. Sebuah galat pembacaan tidak boleh mengunci
         * seluruh pengguna — kebalikan dari fungsi mode ini.
         */
        try {
            $state = AppSetting::ambil('pemeliharaan');
        } catch (Throwable $e) {
            Log::warning('Gagal membaca status pemeliharaan; dilewatkan.', ['pesan' => $e->getMessage()]);

            return $next($request);
        }

        if (! is_array($state) || empty($state['aktif'])) {
            return $next($request);
        }

        $pengguna = $request->user();

        if ($pengguna && $pengguna->boleh(KatalogIzin::SISTEM_MAINTENANCE)) {
            return $next($request);
        }

        $pesan = is_string($state['pesan'] ?? null) && $state['pesan'] !== ''
            ? $state['pesan']
            : 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi beberapa saat lagi.';

        return ApiResponse::error($pesan, 503, ['pemeliharaan' => true]);
    }
}
