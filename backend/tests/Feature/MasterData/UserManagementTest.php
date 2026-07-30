<?php

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Database\Factories\RoleFactory;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

it('menolak selain Administrator melihat daftar pengguna', function (): void {
    foreach (['staff', 'supervisor', 'manager'] as $peran) {
        Sanctum::actingAs(User::factory()->{$peran}()->create());

        $this->getJson('/api/pengguna')->assertForbidden();

        lupakanAutentikasi();
    }
});

it('menyaring pengguna berdasarkan departemen, role, dan status', function (): void {
    $produksi = Department::factory()->create(['name' => 'Produksi']);
    $qa = Department::factory()->create(['name' => 'QA']);

    User::factory()->staff()->create(['name' => 'Ahmad', 'department_id' => $produksi->id]);
    User::factory()->supervisor()->create(['name' => 'Siti', 'department_id' => $produksi->id]);
    User::factory()->staff()->create(['name' => 'Budi', 'department_id' => $qa->id]);
    User::factory()->staff()->nonaktif()->create(['name' => 'Mantan', 'department_id' => $produksi->id]);

    Sanctum::actingAs(User::factory()->administrator()->create(['name' => 'Admin']));

    $namaDepartemen = collect(
        $this->getJson("/api/pengguna?departemen_id={$produksi->id}")->json('data'),
    )->pluck('nama');
    expect($namaDepartemen)->toContain('Ahmad', 'Siti', 'Mantan')->not->toContain('Budi');

    $namaRole = collect($this->getJson('/api/pengguna?role=supervisor')->json('data'))->pluck('nama');
    expect($namaRole)->toContain('Siti')->not->toContain('Ahmad');

    $namaStatus = collect($this->getJson('/api/pengguna?status=nonaktif')->json('data'))->pluck('nama');
    expect($namaStatus)->toContain('Mantan')->not->toContain('Ahmad');

    $namaCari = collect($this->getJson('/api/pengguna?cari=Bud')->json('data'))->pluck('nama');
    expect($namaCari)->toContain('Budi')->not->toContain('Ahmad');
});

it('memaginate daftar pengguna beserta metadata halaman', function (): void {
    User::factory()->count(30)->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->getJson('/api/pengguna?per_halaman=10');

    $response->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.per_halaman', 10)
        ->assertJsonPath('meta.total_data', 31)
        ->assertJsonPath('meta.total_halaman', 4);
});

it('membatasi jumlah data per halaman yang boleh diminta', function (): void {
    User::factory()->count(150)->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->getJson('/api/pengguna?per_halaman=1000')
        ->assertOk()
        ->assertJsonPath('meta.per_halaman', 100);
});

it('tidak pernah mengirim hash kata sandi pada daftar pengguna', function (): void {
    User::factory()->count(3)->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $isi = $this->getJson('/api/pengguna')->getContent();

    expect($isi)->not->toContain('$2y$')->not->toContain('password');
});

it('membuat pengguna baru dengan kata sandi ter-hash', function (): void {
    $departemen = Department::factory()->create();
    $role = RoleFactory::slug(Role::STAFF);
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/pengguna', [
        'name' => 'Ahmad Fauzi',
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-kuat',
        'department_id' => $departemen->id,
        'role_id' => $role->id,
    ])->assertCreated();

    $baru = User::where('email', 'ahmad@hbmcorp.co.id')->firstOrFail();

    expect($baru->password)->not->toBe('kata-sandi-kuat');
    expect(Hash::check('kata-sandi-kuat', $baru->password))->toBeTrue();
});

it('tidak mencatat kata sandi ke jejak audit', function (): void {
    $departemen = Department::factory()->create();
    $role = RoleFactory::slug(Role::STAFF);
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/pengguna', [
        'name' => 'Ahmad Fauzi',
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-rahasia',
        'department_id' => $departemen->id,
        'role_id' => $role->id,
    ])->assertCreated();

    $jejak = AuditLog::latest('id')->first();

    expect(json_encode($jejak->changes))
        ->not->toContain('kata-sandi-rahasia')
        ->toContain('[disaring]');
});

it('menolak kata sandi yang terlalu pendek', function (): void {
    $departemen = Department::factory()->create();
    $role = RoleFactory::slug(Role::STAFF);
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/pengguna', [
        'name' => 'Ahmad',
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'pendek',
        'department_id' => $departemen->id,
        'role_id' => $role->id,
    ])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['password']]);
});

it('mencabut token saat pengguna dinonaktifkan', function (): void {
    $target = User::factory()->staff()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia-sekali',
    ]);

    $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia-sekali',
    ])->assertOk();

    expect($target->tokens()->count())->toBe(1);

    lupakanAutentikasi();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->putJson("/api/pengguna/{$target->id}/status", ['aktif' => false])
        ->assertOk()
        ->assertJsonPath('message', 'Pengguna berhasil dinonaktifkan.');

    expect($target->fresh()->is_active)->toBeFalse();
    expect($target->tokens()->count())->toBe(0);
});

it('menolak administrator menonaktifkan dirinya sendiri', function (): void {
    $admin = User::factory()->administrator()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/pengguna/{$admin->id}/status", ['aktif' => false])
        ->assertForbidden();

    expect($admin->fresh()->is_active)->toBeTrue();
});

it('menonaktifkan administrator lain selama masih ada administrator aktif', function (): void {
    $adminLain = User::factory()->administrator()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->putJson("/api/pengguna/{$adminLain->id}/status", ['aktif' => false])->assertOk();

    expect($adminLain->fresh()->is_active)->toBeFalse();
});

it('menolak menurunkan role administrator aktif terakhir', function (): void {
    $departemen = Department::factory()->create();
    $roleStaff = RoleFactory::slug(Role::STAFF);
    $admin = User::factory()->administrator()->create([
        'name' => 'Admin Tunggal',
        'email' => 'admin@hbmcorp.co.id',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($admin);

    $response = $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => 'Admin Tunggal',
        'email' => 'admin@hbmcorp.co.id',
        'department_id' => $departemen->id,
        'role_id' => $roleStaff->id,
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('administrator aktif terakhir');
    expect($admin->fresh()->isAdministrator())->toBeTrue();
});

it('mengizinkan penurunan role administrator bila masih ada administrator aktif lain', function (): void {
    $departemen = Department::factory()->create();
    $roleStaff = RoleFactory::slug(Role::STAFF);
    User::factory()->administrator()->create();
    $admin = User::factory()->administrator()->create([
        'name' => 'Admin Kedua',
        'email' => 'admin2@hbmcorp.co.id',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($admin);

    $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => 'Admin Kedua',
        'email' => 'admin2@hbmcorp.co.id',
        'department_id' => $departemen->id,
        'role_id' => $roleStaff->id,
    ])->assertOk();

    expect($admin->fresh()->isAdministrator())->toBeFalse();
});

it('mengabaikan administrator nonaktif saat menghitung administrator tersisa', function (): void {
    $departemen = Department::factory()->create();
    $roleStaff = RoleFactory::slug(Role::STAFF);

    // Administrator yang sudah nonaktif tidak bisa dipakai mengelola sistem,
    // sehingga tidak boleh dihitung sebagai cadangan.
    User::factory()->administrator()->nonaktif()->create();

    $admin = User::factory()->administrator()->create([
        'name' => 'Admin Aktif',
        'email' => 'aktif@hbmcorp.co.id',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($admin);

    $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => 'Admin Aktif',
        'email' => 'aktif@hbmcorp.co.id',
        'department_id' => $departemen->id,
        'role_id' => $roleStaff->id,
    ])->assertStatus(422);

    expect($admin->fresh()->isAdministrator())->toBeTrue();
});

it('mengatur ulang kata sandi dan mencabut seluruh token pengguna', function (): void {
    $target = User::factory()->staff()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ]);

    $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ])->assertOk();

    lupakanAutentikasi();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->putJson("/api/pengguna/{$target->id}/kata-sandi", ['password' => 'kata-sandi-baru'])
        ->assertOk()
        ->assertJsonPath('message', 'Kata sandi berhasil diatur ulang.');

    $target->refresh();

    expect(Hash::check('kata-sandi-baru', $target->password))->toBeTrue();
    expect($target->tokens()->count())->toBe(0);
});

it('menolak Staff mengubah data pengguna lain', function (): void {
    $target = User::factory()->staff()->create();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => 'Diganti',
        'email' => 'diganti@hbmcorp.co.id',
        'department_id' => $target->department_id,
        'role_id' => $target->role_id,
    ])->assertForbidden();

    expect($target->fresh()->name)->not->toBe('Diganti');
});

it('menolak Staff mengatur ulang kata sandi pengguna lain', function (): void {
    $target = User::factory()->staff()->create();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->putJson("/api/pengguna/{$target->id}/kata-sandi", ['password' => 'ambil-alih-akun'])
        ->assertForbidden();

    expect(Hash::check('ambil-alih-akun', $target->fresh()->password))->toBeFalse();
});
