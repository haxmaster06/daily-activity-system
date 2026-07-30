<?php

use App\Models\Department;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('mengembalikan data pengguna yang sedang masuk', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);
    $user = User::factory()->supervisor()->create([
        'name' => 'Ahmad Fauzi',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.nama', 'Ahmad Fauzi')
        ->assertJsonPath('data.role.slug', 'supervisor')
        ->assertJsonPath('data.departemen.nama', 'Produksi');
});

it('menolak permintaan tanpa token', function (): void {
    $this->getJson('/api/me')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
});

it('menolak token yang dikarang', function (): void {
    User::factory()->create();

    $this->withHeader('Authorization', 'Bearer 1|token-yang-dikarang-penyerang')
        ->getJson('/api/me')
        ->assertUnauthorized();
});

it('mencabut token saat keluar', function (): void {
    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $token = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->json('data.token');

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Berhasil keluar.');

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/me')
        ->assertUnauthorized();

    expect($user->fresh()->tokens()->count())->toBe(0);
});

it('menolak token milik akun yang dinonaktifkan setelah token terbit', function (): void {
    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $token = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->json('data.token');

    // Administrator menonaktifkan akun setelah token diterbitkan.
    $user->forceFill(['is_active' => false])->save();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/me')
        ->assertForbidden()
        ->assertJsonPath('message', 'Akun Anda tidak aktif. Hubungi administrator.');

    // Tokennya ikut dicabut, bukan sekadar ditolak sekali.
    expect($user->fresh()->tokens()->count())->toBe(0);
});

it('menolak token yang sudah kedaluwarsa', function (): void {
    config()->set('sanctum.expiration', 60);

    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $token = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->json('data.token');

    $this->travel(61)->minutes();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/me')
        ->assertUnauthorized();
});
