<?php

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

it('menampilkan profil sendiri beserta tanggal bergabung', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);
    $pengguna = User::factory()->staff()->create([
        'name' => 'Ahmad Fauzi',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($pengguna);

    $this->getJson('/api/profil')
        ->assertOk()
        ->assertJsonPath('data.pengguna.nama', 'Ahmad Fauzi')
        ->assertJsonPath('data.pengguna.departemen.nama', 'Produksi')
        ->assertJsonStructure(['data' => ['pengguna', 'bergabung_pada', 'masuk_terakhir']]);
});

it('mengizinkan pengguna mengubah namanya sendiri', function (): void {
    $pengguna = User::factory()->staff()->create(['name' => 'Ahmad']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil', ['name' => 'Ahmad Fauzi'])
        ->assertOk()
        ->assertJsonPath('message', 'Profil berhasil diperbarui.');

    expect($pengguna->fresh()->name)->toBe('Ahmad Fauzi');
});

it('tidak mengizinkan pengguna mengubah role atau departemennya sendiri', function (): void {
    $departemenLain = Department::factory()->create();
    $pengguna = User::factory()->staff()->create();
    $roleAwal = $pengguna->role_id;
    $departemenAwal = $pengguna->department_id;

    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil', [
        'name' => 'Ahmad',
        'role_id' => 999,
        'department_id' => $departemenLain->id,
    ])->assertOk();

    $pengguna->refresh();

    expect($pengguna->role_id)->toBe($roleAwal)
        ->and($pengguna->department_id)->toBe($departemenAwal);
});

it('mengubah kata sandi setelah kata sandi lama terbukti benar', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
    ])
        ->assertOk()
        ->assertJsonPath('message', 'Kata sandi berhasil diperbarui.');

    expect(Hash::check('kata-sandi-baru', $pengguna->fresh()->password))->toBeTrue();
});

it('menolak ubah kata sandi bila kata sandi lama salah', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $response = $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'tebakan',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.kata_sandi_lama.0'))->toBe('Kata sandi lama tidak sesuai.');
    expect(Hash::check('kata-sandi-lama', $pengguna->fresh()->password))->toBeTrue();
});

it('menolak kata sandi baru yang sama dengan yang lama', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $response = $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-lama',
        'kata_sandi_baru_confirmation' => 'kata-sandi-lama',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.kata_sandi_baru.0'))
        ->toBe('Kata sandi baru harus berbeda dari kata sandi lama.');
});

it('menolak kata sandi baru tanpa konfirmasi yang cocok', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'salah-ketik',
    ])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['kata_sandi_baru']]);
});

it('mencabut token perangkat lain tetapi mempertahankan sesi yang sedang dipakai', function (): void {
    $pengguna = User::factory()->staff()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ]);

    // Perangkat lama meninggalkan satu token yang masih berlaku.
    $pengguna->createToken('perangkat-lama');

    $token = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ])->json('data.token');

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson('/api/profil/kata-sandi', [
            'kata_sandi_lama' => 'kata-sandi-lama',
            'kata_sandi_baru' => 'kata-sandi-baru',
            'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
        ])
        ->assertOk();

    expect($pengguna->fresh()->tokens()->count())->toBe(1);

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/profil')
        ->assertOk();
});
