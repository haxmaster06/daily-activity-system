<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

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

it('tidak pernah membocorkan pesan galat berbahasa Inggris dari framework', function (): void {
    // Laravel mengubah AuthorizationException menjadi AccessDeniedHttpException
    // yang pesan bawaannya "This action is unauthorized."
    Route::middleware('auth:sanctum')->get('/api/uji-izin', function (): void {
        abort(403);
    });

    Sanctum::actingAs(User::factory()->create());

    $response = $this->getJson('/api/uji-izin');

    $response->assertForbidden()
        ->assertJsonPath('message', 'Anda tidak memiliki akses ke data ini.');

    expect($response->getContent())->not->toContain('This action is unauthorized');
});

it('menerjemahkan galat Policy menjadi pesan Bahasa Indonesia', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/pengguna')
        ->assertForbidden()
        ->assertJsonPath('message', 'Anda tidak memiliki akses ke data ini.');
});

it('menerjemahkan galat metode HTTP yang salah', function (): void {
    $response = $this->postJson('/api/health');

    expect($response->status())->toBe(405);
    expect($response->json('message'))->toBe('Permintaan tidak dapat diproses.');
    expect($response->getContent())->not->toContain('method is not supported');
});
