<?php

namespace App\Http\Middleware;

use Closure;
use DateTimeInterface;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menggeser masa berlaku token selama aplikasi dipakai.
 *
 * Tanpa ini, sesi berakhir sekian jam setelah masuk tanpa memandang apakah
 * pengguna sedang bekerja — untuk aplikasi yang dibuka sepanjang jam kerja,
 * pemutusannya selalu jatuh pada waktu yang paling merepotkan. Yang
 * meninggalkan komputer tetap keluar sendiri, karena patokannya aktivitas
 * terakhir.
 *
 * Panjang jendela sesi tidak dihitung ulang dari config, melainkan dari jarak
 * asli token itu sendiri: pengguna yang mencentang "Ingat saya" tetap
 * memperoleh jendela panjangnya, dan yang tidak tetap memperoleh yang pendek.
 */
class PerpanjangSesi
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        /*
         * Hanya token yang benar-benar tersimpan yang digeser. Sesi uji dan
         * sesi first-party memakai token semu tanpa baris di basis data —
         * tidak ada yang bisa diperpanjang, dan tanggalnya pun tidak terisi.
         */
        if (
            $token instanceof PersonalAccessToken
            && $token->exists
            && $token->expires_at instanceof DateTimeInterface
        ) {
            $this->geser($token);
        }

        return $next($request);
    }

    private function geser(PersonalAccessToken $token): void
    {
        $panjangMenit = (int) $token->sesi_menit;

        // Token yang dibuat di luar alur masuk tidak punya jendela sesi dan
        // dibiarkan berakhir sesuai `expires_at` aslinya.
        if ($panjangMenit <= 0) {
            return;
        }

        $sisaMenit = now()->diffInMinutes($token->expires_at, absolute: false);
        $ambang = (float) config('dams.sesi.ambang_perpanjangan', 0.5);

        /*
         * Ditulis hanya bila sisanya sudah menipis. Menggeser masa berlaku
         * pada setiap permintaan berarti satu tulisan basis data untuk
         * memajukan waktu beberapa detik — sia-sia, dan pada jam sibuk
         * jumlahnya tidak sedikit.
         */
        if ($sisaMenit > $panjangMenit * $ambang) {
            return;
        }

        $token->forceFill(['expires_at' => now()->addMinutes($panjangMenit)])->save();
    }
}
