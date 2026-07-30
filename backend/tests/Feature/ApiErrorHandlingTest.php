<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Galat teknis tidak boleh sampai ke antarmuka (non-fungsional §27).

it('menjawab rute API yang tidak ada dengan pesan Bahasa Indonesia', function (): void {
    $response = $this->getJson('/api/rute-yang-tidak-ada');

    $response->assertNotFound()
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Data yang Anda cari tidak ditemukan.');
});

it('menolak endpoint terautentikasi tanpa token', function (): void {
    Route::middleware('auth:sanctum')->get('/api/uji-terlindungi', fn () => 'rahasia');

    $response = $this->getJson('/api/uji-terlindungi');

    $response->assertUnauthorized()
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
});

it('menyembunyikan detail teknis dan memberi kode referensi saat galat tak terduga', function (): void {
    // Debug dimatikan agar perilaku sama dengan produksi.
    config()->set('app.debug', false);

    Route::get('/api/uji-galat', function (): void {
        throw new RuntimeException('Koneksi ke tabel internal gagal pada baris 42');
    });

    $response = $this->getJson('/api/uji-galat');

    $response->assertStatus(500)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Terjadi gangguan saat memproses permintaan.');

    expect($response->json('reference'))->toMatch('/^ERR-\d{8}-\d{3}$/');

    // Pesan asli exception tidak boleh muncul di response.
    expect($response->getContent())
        ->not->toContain('Koneksi ke tabel internal gagal')
        ->not->toContain('RuntimeException');
});

it('mengembalikan galat validasi dengan pesan Bahasa Indonesia', function (): void {
    Route::post('/api/uji-validasi', function (Request $request): void {
        $request->validate(['nama' => 'required']);
    });

    $response = $this->postJson('/api/uji-validasi', []);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Periksa kembali isian Anda.')
        ->assertJsonStructure(['errors' => ['nama']]);

    expect($response->json('errors.nama.0'))->toContain('wajib diisi');
});
