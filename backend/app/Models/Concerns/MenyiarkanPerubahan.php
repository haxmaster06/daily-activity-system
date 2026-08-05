<?php

namespace App\Models\Concerns;

use App\Events\DataBerubah;

/**
 * Menyiarkan kabar bahwa data sebuah departemen berubah.
 *
 * ## Mengapa lewat model, bukan controller
 *
 * Laporan dan kartu progres berubah dari banyak tempat: controller, import
 * berkas, perintah artisan, dan seeder contoh. Menyiarkannya di tiap controller
 * berarti satu-satunya jalur yang tidak dilalui pengguna biasa — import massal —
 * justru tidak pernah menyiarkan apa pun, dan halaman Analytics tetap diam
 * setelah lima ratus baris masuk.
 *
 * ## Tidak disiarkan di dalam transaksi yang belum selesai
 *
 * `DataBerubah` memasang `ShouldDispatchAfterCommit`, sehingga siarannya
 * tertahan sampai transaksinya benar-benar tersimpan. Import berjalan di dalam
 * satu transaksi; menyiarkan lebih awal berarti penerimanya memuat ulang dan
 * membaca keadaan **sebelum** perubahan — lalu tidak pernah mendapat kabar lagi.
 *
 * Penundaannya ada pada event, bukan pada pemanggilnya: `dispatch()` pada event
 * mengembalikan hasil pendengarnya, bukan pengiriman yang masih dapat diatur,
 * sehingga `->afterCommit()` di sini justru menghasilkan galat.
 */
trait MenyiarkanPerubahan
{
    public static function bootMenyiarkanPerubahan(): void
    {
        foreach (['created', 'updated', 'deleted'] as $peristiwa) {
            static::{$peristiwa}(function (self $model): void {
                $model->siarkanPerubahan();
            });
        }
    }

    /** Jenis perubahan yang disiarkan — `DataBerubah::LAPORAN` atau `TUGAS`. */
    abstract protected function jenisSiaran(): string;

    private function siarkanPerubahan(): void
    {
        $departemenId = (int) ($this->department_id ?? 0);

        if ($departemenId === 0) {
            return;
        }

        DataBerubah::dispatch($departemenId, $this->jenisSiaran());
    }
}
