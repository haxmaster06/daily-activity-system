<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Kode referensi galat yang ditampilkan ke user, mis. `ERR-20260730-001`.
 *
 * User menyebutkan kode ini saat melapor; tim menelusurinya di log tanpa
 * pernah menampilkan detail teknis di antarmuka (non-fungsional §27).
 */
final class ErrorReference
{
    public static function generate(): string
    {
        $tanggal = now()->format('Ymd');
        $urutan = Cache::increment(self::cacheKey($tanggal));

        // Cache::increment mengembalikan false bila kunci belum ada pada
        // sebagian driver; mulai dari 1 dan tetapkan masa berlaku sehari.
        if (! is_int($urutan) || $urutan < 1) {
            $urutan = 1;
            Cache::put(self::cacheKey($tanggal), $urutan, now()->endOfDay());
        }

        return sprintf('ERR-%s-%03d', $tanggal, $urutan);
    }

    private static function cacheKey(string $tanggal): string
    {
        return "error_reference:{$tanggal}";
    }
}
