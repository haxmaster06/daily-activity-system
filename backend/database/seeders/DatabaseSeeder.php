<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Seluruh seeder master data bersifat idempotent — `php artisan db:seed` aman
 * dijalankan berulang dan tidak pernah menghapus data yang sudah ada.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            // Katalog izin lebih dulu, baru pemberiannya ke peran.
            IzinSeeder::class,
            IzinRoleSeeder::class,
            DepartmentSeeder::class,
            MasterDataSeeder::class,
            ReportTemplateSeeder::class,
            AdministratorSeeder::class,
        ]);
    }
}
