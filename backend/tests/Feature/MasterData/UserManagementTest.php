<?php

use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\Audit;
use Database\Factories\RoleFactory;
use Illuminate\Support\Facades\DB;
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

it('menolak menurunkan peran pengelola aktif terakhir', function (): void {
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
    expect($response->json('message'))->toContain('mengelola pengguna sekaligus hak akses');

    // Perubahan dibatalkan seluruhnya, bukan sebagian.
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

it('menghapus akun yang belum meninggalkan jejak', function (): void {
    $departemen = Department::factory()->create();
    User::factory()->administrator()->create();

    Sanctum::actingAs(User::factory()->administrator()->create());

    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $target->createToken('uji', expiresAt: now()->addHour());

    $this->deleteJson("/api/pengguna/{$target->id}")->assertOk();

    expect(User::whereKey($target->id)->exists())->toBeFalse();

    // Token yang sudah terbit ikut dicabut — relasi morph tidak punya kunci
    // asing, jadi tidak terhapus dengan sendirinya.
    expect(DB::table('personal_access_tokens')
        ->where('tokenable_id', $target->id)->where('tokenable_type', User::class)
        ->exists())->toBeFalse();
});

it('menghapus akun beserta seluruh laporannya', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $laporan = DailyReport::factory()->milik($target)->create();

    $this->deleteJson("/api/pengguna/{$target->id}")->assertOk();

    expect(User::whereKey($target->id)->exists())->toBeFalse()
        ->and(DailyReport::whereKey($laporan->id)->exists())->toBeFalse();
});

it('menolak menghapus akun administrator awal', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $sistem = User::factory()->administrator()->create(['name' => 'Administrator DAMS']);
    $sistem->forceFill(['is_system' => true])->save();

    $response = $this->deleteJson("/api/pengguna/{$sistem->id}")->assertStatus(422);

    expect($response->json('message'))->toContain('administrator awal')
        ->and(User::whereKey($sistem->id)->exists())->toBeTrue();
});

it('mencatat jumlah laporan yang ikut terhapus pada jejak audit', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    DailyReport::factory()->milik($target)->create();
    DailyReport::factory()->milik($target)->create(['report_date' => now()->subDay()]);

    $this->deleteJson("/api/pengguna/{$target->id}")->assertOk();

    // Setelah datanya hilang, jejak audit satu-satunya bukti berapa yang ikut.
    expect(AuditLog::latest('id')->first()->changes['laporan_terhapus'])->toBe(2);
});

it('menolak menghapus diri sendiri', function (): void {
    $admin = User::factory()->administrator()->create([
        'department_id' => Department::factory(),
    ]);
    User::factory()->administrator()->create();

    Sanctum::actingAs($admin);

    $this->deleteJson("/api/pengguna/{$admin->id}")->assertStatus(403);

    expect(User::whereKey($admin->id)->exists())->toBeTrue();
});

it('menolak penghapusan oleh pengguna tanpa izin mengelola', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $departemen->id]));

    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);

    $this->deleteJson("/api/pengguna/{$target->id}")->assertStatus(403);

    expect(User::whereKey($target->id)->exists())->toBeTrue();
});

it('menjaga jejak audit tetap terbaca setelah akunnya dihapus', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $target = User::factory()->staff()->create([
        'name' => 'Akun Salah Buat',
        'department_id' => $departemen->id,
    ]);

    $this->deleteJson("/api/pengguna/{$target->id}")->assertOk();

    $jejak = AuditLog::latest('id')->first();

    // Namanya sudah didenormalkan sejak awal, jadi riwayat tidak menunjuk
    // ke ketiadaan.
    expect($jejak->action)->toBe(Audit::AKSI_DIHAPUS)
        ->and($jejak->description)->toContain('Akun Salah Buat');
});

it('menyertakan jumlah laporan dan lampiran pada daftar pengguna', function (): void {
    $departemen = Department::factory()->create();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $bersih = User::factory()->staff()->create([
        'name' => 'Belum Dipakai',
        'department_id' => $departemen->id,
    ]);
    $terpakai = User::factory()->staff()->create([
        'name' => 'Sudah Melapor',
        'department_id' => $departemen->id,
    ]);
    DailyReport::factory()->milik($terpakai)->create();

    $daftar = collect($this->getJson('/api/pengguna')->assertOk()->json('data'));

    // Keduanya dapat dihapus; yang membedakan hanya akibatnya, dan angkanya
    // dipakai peringatan sebelum penghapusan.
    expect($daftar->firstWhere('id', $bersih->id)['dapat_dihapus'])->toBeTrue()
        ->and($daftar->firstWhere('id', $bersih->id)['jumlah_laporan'])->toBe(0)
        ->and($daftar->firstWhere('id', $terpakai->id)['dapat_dihapus'])->toBeTrue()
        ->and($daftar->firstWhere('id', $terpakai->id)['jumlah_laporan'])->toBe(1);
});

it('menolak memberikan departemen sistem kepada akun lain', function (): void {
    $sistem = Department::factory()->create(['code' => 'SISTEM_UJI']);
    $sistem->forceFill(['is_system' => true])->save();

    Sanctum::actingAs(User::factory()->administrator()->create());

    $target = User::factory()->staff()->create(['department_id' => Department::factory()]);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $sistem->id,
    ])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['department_id']]);

    expect($target->fresh()->department_id)->not->toBe($sistem->id);
});

it('tidak menawarkan departemen sistem pada daftar pilihan', function (): void {
    $sistem = Department::factory()->create(['code' => 'SISTEM_UJI2', 'name' => 'Sistem']);
    $sistem->forceFill(['is_system' => true])->save();

    $biasa = Department::factory()->create(['code' => 'PRODUKSI_UJI2', 'name' => 'Produksi']);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $kode = collect($this->getJson('/api/departemen')->assertOk()->json('data'))->pluck('kode');

    expect($kode)->toContain('PRODUKSI_UJI2')->not->toContain('SISTEM_UJI2')
        ->and($biasa->fresh()->is_system)->toBeFalse();
});

it('mengizinkan akun sistem tetap di departemen sistem saat disunting', function (): void {
    $sistem = Department::factory()->create(['code' => 'SISTEM_UJI3']);
    $sistem->forceFill(['is_system' => true])->save();

    $admin = User::factory()->administrator()->create(['department_id' => $sistem->id]);
    $admin->forceFill(['is_system' => true])->save();

    User::factory()->administrator()->create();
    Sanctum::actingAs($admin);

    /*
     * Menyunting nama akun sistem tidak boleh ditolak hanya karena
     * departemennya sendiri termasuk departemen sistem — tidak ada pilihan
     * lain yang sah untuknya.
     */
    $this->putJson("/api/pengguna/{$admin->id}", [
        'name' => 'Super Admin',
        'email' => $admin->email,
        'department_id' => $sistem->id,
    ])->assertOk();

    expect($admin->fresh()->name)->toBe('Super Admin');
});
