<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Support\KatalogIzin;
use Illuminate\Database\Seeder;

/**
 * Memproyeksikan katalog izin ke basis data.
 *
 * Idempotent dan tidak pernah menghapus (ADR-008). Izin yang dicabut dari
 * katalog dibiarkan tertinggal di tabel: menghapusnya akan ikut mencabut
 * centang yang sudah dipasang operator, dan barisnya tidak berbahaya karena
 * tidak ada lagi kode yang memeriksanya.
 */
class IzinSeeder extends Seeder
{
    public function run(): void
    {
        foreach (KatalogIzin::semua() as $izin) {
            Permission::updateOrCreate(['key' => $izin['key']], $izin);
        }
    }
}
