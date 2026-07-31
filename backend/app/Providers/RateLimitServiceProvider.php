<?php

namespace App\Providers;

use App\Support\ApiResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Rate limit untuk endpoint yang rawan disalahgunakan (non-fungsional §7).
 */
class RateLimitServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /*
         * Login dibatasi per kombinasi email + alamat IP. Membatasi hanya per
         * IP membuat satu kantor saling mengunci; membatasi hanya per email
         * membuat penyerang bebas mencoba banyak akun dari satu mesin.
         */
        RateLimiter::for('login', function (Request $request) {
            $kunci = mb_strtolower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)
                ->by($kunci)
                ->response(fn () => ApiResponse::error(
                    'Terlalu banyak percobaan masuk. Coba lagi dalam satu menit.',
                    429,
                ));
        });

        /*
         * Pengingat menghasilkan notifikasi ke orang lain. Batas per hari
         * sudah ditegakkan per penerima di controller; batas ini menahan
         * pengiriman beruntun ke banyak orang sekaligus.
         */
        RateLimiter::for('pengingat', function (Request $request) {
            return Limit::perMinute(20)
                ->by($request->user()?->getAuthIdentifier() ?? $request->ip())
                ->response(fn () => ApiResponse::error(
                    'Terlalu banyak pengingat dikirim. Coba lagi dalam satu menit.',
                    429,
                ));
        });

        /*
         * Unggahan lampiran. Tiap permintaan menulis berkas ke disk, sehingga
         * penyalahgunaannya menghabiskan ruang penyimpanan, bukan sekadar
         * waktu CPU.
         */
        RateLimiter::for('unggah', function (Request $request) {
            return Limit::perMinute(20)
                ->by($request->user()?->getAuthIdentifier() ?? $request->ip())
                ->response(fn () => ApiResponse::error(
                    'Terlalu banyak unggahan. Coba lagi dalam satu menit.',
                    429,
                ));
        });

        // Batas umum untuk seluruh endpoint terautentikasi.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->getAuthIdentifier() ?? $request->ip(),
            );
        });
    }
}
