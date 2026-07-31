<?php

namespace App\Support;

use App\Exceptions\PengelolaTerakhirException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Menjaga agar sistem tidak kehilangan seluruh pengelolanya.
 *
 * Sejak hak akses dapat dicentang dari layar, ada beberapa cara mengunci diri
 * sendiri keluar yang sebelumnya mustahil:
 *
 *   1. mencabut izin pengelolaan dari peran yang dipegang pengelola terakhir,
 *   2. menonaktifkan akun pengelola terakhir,
 *   3. mengganti penetapan peran pengelola terakhir,
 *   4. menghapus peran yang menjadi satu-satunya sumber izin itu.
 *
 * Keempatnya berujung pada keadaan yang sama: tidak ada lagi akun yang dapat
 * memperbaikinya, dan pemulihannya hanya lewat konsol di server.
 *
 * Yang dijaga adalah kombinasi **mengelola pengguna** DAN **mengelola peran** —
 * dua izin yang diperlukan untuk membatalkan kesalahan apa pun. Memegang salah
 * satunya saja tidak cukup: yang hanya bisa mengelola pengguna tidak dapat
 * mengembalikan izin yang tercabut dari sebuah peran.
 */
final class PenjagaAkses
{
    /**
     * Menjalankan perubahan, lalu memeriksa akibatnya.
     *
     * Diperiksa setelah perubahan diterapkan, di dalam transaksi yang sama.
     * Memeriksa lebih dulu berarti menebak akibatnya, dan tebakan itu harus
     * ditulis berbeda untuk tiap pintu — empat penghitungan yang cepat atau
     * lambat akan berbeda pendapat.
     *
     * @template T
     *
     * @param  callable(): T  $mutasi
     * @return T
     */
    public static function jalankan(callable $mutasi): mixed
    {
        return DB::transaction(function () use ($mutasi) {
            $hasil = $mutasi();

            if (self::tidakAdaPengelolaTersisa()) {
                throw new PengelolaTerakhirException(
                    'Perubahan ini akan menghabiskan satu-satunya akun yang dapat '.
                    'mengelola pengguna sekaligus hak akses. Beri wewenang itu ke '.
                    'akun lain terlebih dahulu.',
                );
            }

            return $hasil;
        });
    }

    private static function tidakAdaPengelolaTersisa(): bool
    {
        return User::query()
            ->where('is_active', true)
            /*
             * Dua klausa terpisah, bukan satu `whereIn` dengan hitungan.
             * Hitungan akan menganggap cukup bila dua peran berbeda
             * memberikan izin yang sama dua kali.
             */
            ->whereHas('roles.permissions', fn ($query) => $query
                ->where('key', KatalogIzin::PENGGUNA_KELOLA))
            ->whereHas('roles.permissions', fn ($query) => $query
                ->where('key', KatalogIzin::ROLE_KELOLA))
            ->doesntExist();
    }
}
