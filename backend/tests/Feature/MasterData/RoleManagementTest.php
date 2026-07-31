<?php

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\KatalogIzin;
use Database\Factories\RoleFactory;
use Laravel\Sanctum\Sanctum;

function sebagaiPengelolaPeran(): User
{
    $admin = User::factory()->administrator()->create([
        'department_id' => Department::factory(),
    ]);

    Sanctum::actingAs($admin);

    return $admin;
}

it('menampilkan daftar peran beserta hak aksesnya', function (): void {
    sebagaiPengelolaPeran();

    $data = $this->getJson('/api/role')->assertOk()->json('data');

    $administrator = collect($data)->firstWhere('slug', Role::ADMINISTRATOR);

    expect($administrator['sistem'])->toBeTrue()
        ->and($administrator['izin'])->toContain(KatalogIzin::ROLE_KELOLA)
        ->and($administrator['jumlah_pengguna'])->toBe(1);
});

it('menyediakan katalog izin yang sudah dikelompokkan', function (): void {
    sebagaiPengelolaPeran();

    $grup = collect($this->getJson('/api/izin')->assertOk()->json('data'));

    expect($grup->pluck('kunci')->all())->toBe(array_keys(KatalogIzin::GRUP));

    $laporan = $grup->firstWhere('kunci', 'laporan');

    // Yang tampil adalah namanya, bukan kunci teknisnya.
    expect(collect($laporan['izin'])->pluck('nama'))->toContain('Meninjau laporan');
});

it('membuat peran baru dengan slug otomatis', function (): void {
    sebagaiPengelolaPeran();

    $response = $this->postJson('/api/role', [
        'name' => 'Auditor Mutu',
        'description' => 'Membaca dan mengexport laporan seluruh departemen.',
        'scope_level_default' => 3,
        'izin' => [KatalogIzin::LAPORAN_LIHAT, KatalogIzin::EXPORT_LAPORAN],
    ])->assertCreated();

    expect($response->json('data.slug'))->toBe('auditor_mutu')
        ->and($response->json('data.sistem'))->toBeFalse()
        ->and($response->json('data.izin'))->toHaveCount(2);
});

it('menolak pengguna tanpa izin mengelola peran', function (): void {
    Sanctum::actingAs(User::factory()->supervisor()->create([
        'department_id' => Department::factory(),
    ]));

    $this->postJson('/api/role', ['name' => 'Auditor', 'izin' => []])->assertStatus(403);
    $this->getJson('/api/role')->assertStatus(403);
});

it('mengubah hak akses sebuah peran', function (): void {
    sebagaiPengelolaPeran();

    $peran = RoleFactory::slug(Role::SUPERVISOR);

    $this->putJson("/api/role/{$peran->id}", [
        'name' => 'Supervisor',
        'izin' => [KatalogIzin::LAPORAN_LIHAT],
    ])->assertOk();

    expect($peran->fresh()->permissions->pluck('key')->all())
        ->toBe([KatalogIzin::LAPORAN_LIHAT]);
});

it('tidak mengubah slug peran walau namanya diperbaiki', function (): void {
    sebagaiPengelolaPeran();

    $peran = RoleFactory::slug(Role::SUPERVISOR);

    $this->putJson("/api/role/{$peran->id}", [
        'name' => 'Penyelia',
        'izin' => KatalogIzin::bawaanPeran()[Role::SUPERVISOR],
    ])->assertOk();

    // Slug adalah rujukan seeder dan factory; hanya namanya yang boleh berubah.
    expect($peran->fresh()->slug)->toBe(Role::SUPERVISOR)
        ->and($peran->fresh()->name)->toBe('Penyelia');
});

it('menolak menghapus peran bawaan', function (): void {
    sebagaiPengelolaPeran();

    $peran = RoleFactory::slug(Role::STAFF);

    $this->deleteJson("/api/role/{$peran->id}")->assertStatus(403);

    expect(Role::whereKey($peran->id)->exists())->toBeTrue();
});

it('menolak menghapus peran yang masih dipakai', function (): void {
    sebagaiPengelolaPeran();

    $peran = RoleFactory::slug('auditor');
    $pengguna = User::factory()->create(['department_id' => Department::factory()]);
    $pengguna->syncRoles([
        ['role_id' => $peran->id, 'scope_level' => 1, 'department_id' => null],
    ]);

    $this->deleteJson("/api/role/{$peran->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', fn (string $pesan) => str_contains($pesan, '1 pengguna'));
});

it('menghapus peran yang tidak dipakai siapa pun', function (): void {
    sebagaiPengelolaPeran();

    $peran = RoleFactory::slug('auditor');

    $this->deleteJson("/api/role/{$peran->id}")->assertOk();

    expect(Role::whereKey($peran->id)->exists())->toBeFalse();
});
