<?php

namespace App\Support;

use App\Models\User;

/**
 * Aturan siapa yang boleh mendengarkan channel siaran.
 *
 * ## Mengapa dipisah dari `routes/channels.php`
 *
 * Otorisasi channel hanya dapat diuji lewat `POST /broadcasting/auth`, dan
 * endpoint itu **tidak dapat diuji di lingkungan test ini**: dengan
 * `BROADCAST_CONNECTION=null` broadcaster meloloskan setiap permintaan tanpa
 * memanggil callback channel sama sekali, sedangkan memaksanya ke `reverb`
 * membuat seluruh permintaan ditolak — termasuk channel milik sendiri yang
 * jawabannya selalu ya.
 *
 * Test yang lulus pada keduanya tidak membuktikan apa pun. Karena itu aturannya
 * tinggal di sini, diuji langsung, dan `channels.php` hanya memanggilnya.
 */
final class IzinChannel
{
    /**
     * Bolehkah pengguna ini mendengarkan perubahan sebuah departemen.
     *
     * Aturannya sama persis dengan yang dipakai Executive Analytics, dan harus
     * tetap sama: yang boleh mendengarkan hanya yang jangkauan datanya mencakup
     * departemen itu. Muatan siarannya memang tipis — hanya id departemen dan
     * jenis perubahannya — tetapi pola siapa-mengirim-kapan sendiri sudah
     * bercerita tentang departemen yang tidak boleh ia lihat.
     */
    public static function departemen(User $pengguna, int $departemenId): bool
    {
        $jangkauan = $pengguna->jangkauan();

        return $jangkauan->korporat() || $jangkauan->mencakupDepartemen($departemenId);
    }
}
