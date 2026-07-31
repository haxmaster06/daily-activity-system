<?php

use App\Models\Department;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;

/**
 * Satu-satunya test yang benar-benar menguji `$with` pada model User.
 *
 * `handleLazyLoadingViolation()` keluar lebih awal bila model belum tersimpan
 * atau baru saja dibuat. Hampir seluruh test lain masuk lewat
 * `Sanctum::actingAs(User::factory()->create())` — model yang baru dibuat —
 * sehingga `$with` tidak pernah dijalani.
 *
 * Permintaan sungguhan menempuh jalur berbeda: token dicari, `tokenable`
 * dimuat lewat `User::find()`, dan barulah `$with` berlaku. Tanpa test ini,
 * relasi yang lupa di-eager-load akan lolos seluruh rangkaian test lalu
 * menggagalkan permintaan pertama di lingkungan sungguhan.
 */
function tokenUntuk(User $pengguna): string
{
    return $pengguna->createToken('uji', expiresAt: now()->addHour())->plainTextToken;
}

it('melayani permintaan bertoken tanpa lazy loading', function (): void {
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    $admin = User::factory()->administrator()->create([
        'department_id' => Department::factory(),
    ]);

    $token = tokenUntuk($admin);

    foreach (['/api/me', '/api/laporan', '/api/pengguna', '/api/dashboard', '/api/role'] as $alamat) {
        lupakanAutentikasi();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson($alamat)
            ->assertOk();
    }
});

it('melayani permintaan bertoken bagi pengguna berjangkauan Departemen', function (): void {
    test()->seed(DepartmentSeeder::class);

    $supervisor = User::factory()->supervisor()->create([
        'department_id' => Department::factory(),
    ]);

    $token = tokenUntuk($supervisor);

    foreach (['/api/me', '/api/laporan', '/api/monitoring', '/api/dashboard'] as $alamat) {
        lupakanAutentikasi();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson($alamat)
            ->assertOk();
    }
});
