<?php

use App\Models\Department;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\KatalogIzin;
use Database\Factories\RoleFactory;
use Laravel\Sanctum\Sanctum;

/**
 * Empat pintu yang dapat membuat sistem kehilangan seluruh pengelolanya.
 *
 * Sebelum hak akses dapat dicentang dari layar, satu-satunya jalan adalah
 * menurunkan role administrator terakhir. Sekarang ada empat, dan tiga di
 * antaranya tidak pernah dijaga sebelumnya.
 */
function pengelolaTunggal(): User
{
    return User::factory()->administrator()->create([
        'department_id' => Department::factory(),
    ]);
}

it('menolak melepas izin pengelolaan dari peran pengelola terakhir', function (): void {
    $admin = pengelolaTunggal();
    Sanctum::actingAs($admin);

    $peran = Role::where('slug', Role::ADMINISTRATOR)->firstOrFail();

    // Melepas satu centang di layar peran cukup untuk mengunci semua orang.
    $sisa = collect(KatalogIzin::kunci())
        ->reject(fn (string $kunci) => $kunci === KatalogIzin::PENGGUNA_KELOLA)
        ->values()
        ->all();

    $this->putJson("/api/role/{$peran->id}", [
        'name' => 'Administrator',
        'izin' => $sisa,
    ])->assertStatus(422)
        ->assertJsonPath('message', fn (string $pesan) => str_contains($pesan, 'mengelola pengguna'));

    expect($admin->fresh()->boleh(KatalogIzin::PENGGUNA_KELOLA))->toBeTrue();
});

it('menolak menonaktifkan akun pengelola terakhir', function (): void {
    $admin = pengelolaTunggal();

    // Peran yang boleh menonaktifkan, tetapi tidak boleh mengelola pengguna —
    // pemisahan yang sebelumnya mustahil.
    $hrd = RoleFactory::slug('hrd');
    $hrd->permissions()->sync(
        Permission::whereIn('key', [
            KatalogIzin::PENGGUNA_LIHAT,
            KatalogIzin::PENGGUNA_NONAKTIFKAN,
        ])->pluck('id'),
    );

    $petugas = User::factory()->create(['department_id' => Department::factory()]);
    $petugas->syncRoles([['role_id' => $hrd->id, 'scope_level' => 1, 'department_id' => null]]);

    Sanctum::actingAs($petugas->fresh());

    $this->putJson("/api/pengguna/{$admin->id}/status", ['aktif' => false])
        ->assertStatus(422);

    expect($admin->fresh()->is_active)->toBeTrue();
});

it('menolak mengganti penetapan peran pengelola terakhir', function (): void {
    $admin = pengelolaTunggal();
    Sanctum::actingAs($admin);

    $staff = RoleFactory::slug(Role::STAFF);

    $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => $admin->name,
        'email' => $admin->email,
        'department_id' => $admin->department_id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => 1, 'department_id' => null],
        ],
    ])->assertStatus(422);

    expect($admin->fresh()->boleh(KatalogIzin::ROLE_KELOLA))->toBeTrue();
});

it('menolak menghapus peran yang menjadi satu-satunya sumber izin pengelolaan', function (): void {
    $admin = pengelolaTunggal();
    Sanctum::actingAs($admin);

    $peran = Role::where('slug', Role::ADMINISTRATOR)->firstOrFail();

    // Peran bawaan ditolak Policy lebih dulu — pemakainya pun masih ada.
    $this->deleteJson("/api/role/{$peran->id}")->assertStatus(403);

    expect(Role::whereKey($peran->id)->exists())->toBeTrue();
});

it('mengizinkan perubahan bila masih ada pengelola lain', function (): void {
    $admin = pengelolaTunggal();
    User::factory()->administrator()->create(['department_id' => Department::factory()]);

    Sanctum::actingAs($admin);

    $staff = RoleFactory::slug(Role::STAFF);

    $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => $admin->name,
        'email' => $admin->email,
        'department_id' => $admin->department_id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => 1, 'department_id' => null],
        ],
    ])->assertOk();

    expect($admin->fresh()->boleh(KatalogIzin::PENGGUNA_KELOLA))->toBeFalse();
});
