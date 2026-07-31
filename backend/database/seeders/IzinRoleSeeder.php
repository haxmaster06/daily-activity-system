<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\KatalogIzin;
use Illuminate\Database\Seeder;

/**
 * Memberikan izin bawaan kepada empat peran sistem.
 *
 * Memakai `syncWithoutDetaching`, bukan `sync()`. `sync()` akan mencabut izin
 * yang sengaja dicentang operator setiap kali seeder dijalankan ulang — dan
 * seeder ini memang dijalankan ulang tiap deploy.
 */
class IzinRoleSeeder extends Seeder
{
    public function run(): void
    {
        $idIzin = Permission::pluck('id', 'key');

        foreach (KatalogIzin::bawaanPeran() as $slug => $kunciIzin) {
            $peran = Role::where('slug', $slug)->first();

            if (! $peran) {
                continue;
            }

            $peran->permissions()->syncWithoutDetaching(
                collect($kunciIzin)
                    ->map(fn (string $kunci) => $idIzin[$kunci] ?? null)
                    ->filter()
                    ->all(),
            );
        }
    }
}
