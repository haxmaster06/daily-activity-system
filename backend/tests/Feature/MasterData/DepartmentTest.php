<?php

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('menolak Staff menambah departemen', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/departemen', ['name' => 'Baru'])
        ->assertForbidden();

    expect(Department::where('code', 'BARU')->exists())->toBeFalse();
});

it('menolak Supervisor dan Manager menambah departemen', function (): void {
    foreach (['supervisor', 'manager'] as $peran) {
        Sanctum::actingAs(User::factory()->{$peran}()->create());

        $this->postJson('/api/departemen', ['name' => 'Baru'])
            ->assertForbidden();

        lupakanAutentikasi();
    }
});

it('mengizinkan Administrator menambah departemen', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/departemen', [
        'name' => 'Research & Development',
        'description' => 'Pengembangan produk',
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'Departemen berhasil ditambahkan.')
        // Kode diturunkan dari nama, tidak diketik pengguna.
        ->assertJsonPath('data.kode', 'RESEARCH_DEVELOPMENT');
});

it('mencatat penambahan departemen ke jejak audit', function (): void {
    $admin = User::factory()->administrator()->create(['name' => 'Admin Utama']);
    Sanctum::actingAs($admin);

    $this->postJson('/api/departemen', ['name' => 'R&D'])->assertCreated();

    $jejak = AuditLog::latest('id')->first();

    expect($jejak->module)->toBe('departemen')
        ->and($jejak->action)->toBe('dibuat')
        ->and($jejak->user_id)->toBe($admin->id)
        ->and($jejak->user_name)->toBe('Admin Utama')
        ->and($jejak->description)->toContain('R&D');
});

it('membuat kode unik saat namanya menghasilkan kode yang sudah dipakai', function (): void {
    Department::factory()->create(['code' => 'PRODUKSI', 'name' => 'Produksi Lama']);
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/departemen', ['name' => 'Produksi'])
        ->assertCreated()
        ->assertJsonPath('data.kode', 'PRODUKSI_2');
});

it('mengabaikan kode yang dikirim klien', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    // Kode adalah penanda sistem; klien tidak boleh menentukannya.
    $this->postJson('/api/departemen', ['name' => 'Gudang Bahan', 'code' => 'DIPAKSA'])
        ->assertCreated()
        ->assertJsonPath('data.kode', 'GUDANG_BAHAN');

    expect(Department::where('code', 'DIPAKSA')->exists())->toBeFalse();
});

it('tidak mengubah kode saat nama departemen diperbarui', function (): void {
    $departemen = Department::factory()->create(['code' => 'GUDANG', 'name' => 'Gudang']);
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->putJson("/api/departemen/{$departemen->id}", ['name' => 'Gudang Bahan Baku'])
        ->assertOk()
        ->assertJsonPath('data.nama', 'Gudang Bahan Baku')
        // Kode sudah menjadi rujukan seeder, template, dan data lama.
        ->assertJsonPath('data.kode', 'GUDANG');
});

it('menolak menghapus departemen yang masih punya anggota', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);
    User::factory()->count(3)->create(['department_id' => $departemen->id]);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->deleteJson("/api/departemen/{$departemen->id}");

    $response->assertStatus(422);
    expect($response->json('message'))
        ->toContain('3 anggota')
        ->toContain('nonaktifkan');

    expect(Department::whereKey($departemen->id)->exists())->toBeTrue();
});

it('menghapus departemen yang tidak punya anggota', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->deleteJson("/api/departemen/{$departemen->id}")
        ->assertOk()
        ->assertJsonPath('message', 'Departemen berhasil dihapus.');

    expect(Department::whereKey($departemen->id)->exists())->toBeFalse();
});

it('menampilkan jumlah anggota tiap departemen tanpa query berulang', function (): void {
    $produksi = Department::factory()->create(['name' => 'Produksi']);
    $qa = Department::factory()->create(['name' => 'QA']);
    User::factory()->count(2)->create(['department_id' => $produksi->id]);
    User::factory()->count(5)->create(['department_id' => $qa->id]);

    Sanctum::actingAs(User::factory()->administrator()->create(['department_id' => $qa->id]));

    $response = $this->getJson('/api/departemen');

    $jumlah = collect($response->json('data'))->pluck('jumlah_anggota', 'nama');

    expect($jumlah['Produksi'])->toBe(2)
        ->and($jumlah['QA'])->toBe(6); // 5 + administrator yang sedang masuk
});

it('mengizinkan Staff membaca daftar departemen', function (): void {
    Department::factory()->count(3)->create();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/departemen')->assertOk();
});
