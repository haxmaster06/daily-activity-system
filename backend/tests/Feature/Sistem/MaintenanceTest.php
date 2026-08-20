<?php

use App\Models\AppSetting;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function nyalakanPemeliharaan(?string $pesan = null): void
{
    AppSetting::simpan('pemeliharaan', ['aktif' => true, 'pesan' => $pesan]);
}

it('menahan pengguna biasa dengan 503 saat pemeliharaan aktif', function (): void {
    nyalakanPemeliharaan('Sedang perbaikan.');
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/me')
        ->assertStatus(503)
        ->assertJsonPath('errors.pemeliharaan', true)
        ->assertJsonPath('message', 'Sedang perbaikan.');
});

it('meloloskan administrator saat pemeliharaan aktif', function (): void {
    nyalakanPemeliharaan();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->getJson('/api/me')->assertOk();
});

it('membiarkan semua orang lewat saat pemeliharaan mati', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/me')->assertOk();
});

/*
 * Statusnya harus terbaca tanpa autentikasi dan tanpa terhalang penjaga
 * pemeliharaan — tanpa itu halaman pemeliharaan tak bisa menampilkan pesannya.
 */
it('menyediakan status pemeliharaan secara publik walau mode aktif', function (): void {
    nyalakanPemeliharaan('Halo');

    $this->getJson('/api/pemeliharaan')
        ->assertOk()
        ->assertJsonPath('data.aktif', true)
        ->assertJsonPath('data.pesan', 'Halo');
});

it('hanya yang berizin yang dapat menyalakan atau mematikan', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());
    $this->putJson('/api/pemeliharaan', ['aktif' => true])->assertForbidden();

    Sanctum::actingAs(User::factory()->administrator()->create());
    $this->putJson('/api/pemeliharaan', ['aktif' => true, 'pesan' => 'Uji'])->assertOk();

    expect(AppSetting::ambil('pemeliharaan')['aktif'])->toBeTrue();
});
