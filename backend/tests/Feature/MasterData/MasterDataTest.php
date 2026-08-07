<?php

use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Laravel\Sanctum\Sanctum;

function jenisUji(string $nama = 'Supplier Uji', ?MasterType $induk = null): MasterType
{
    return MasterType::factory()->create([
        'name' => $nama,
        'slug' => str($nama)->slug('_')->toString(),
        'parent_type_id' => $induk?->id,
    ]);
}

it('menolak pengelolaan daftar tanpa izin', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/master/jenis', ['name' => 'Mesin'])->assertForbidden();
});

it('membolehkan staf membaca daftar master', function (): void {
    // Diperlukan saat mengisi laporan berkolom master.
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/master/jenis')->assertOk();
});

it('membuat jenis daftar dengan slug dari namanya', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/master/jenis', ['name' => 'Mesin Produksi'])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'mesin_produksi');
});

it('tidak mengubah slug ketika namanya diperbaiki', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $jenis = jenisUji('Mesin');

    $this->putJson("/api/master/jenis/{$jenis->slug}", ['name' => 'Mesin Pabrik'])
        ->assertOk()
        ->assertJsonPath('data.slug', 'mesin')
        ->assertJsonPath('data.nama', 'Mesin Pabrik');
});

/*
 * Tanda `is_system` tidak lagi menghalangi penghapusan.
 *
 * Tanda itu hanya menyatakan daftarnya dibuat seeder — bukan alasan yang dapat
 * dijelaskan kepada administrator perusahaan yang memang tidak memakai daftar
 * tersebut. Yang menahan penghapusan kini rujukan yang masih hidup: kolom
 * template yang memakainya, dan daftar turunan yang berinduk padanya. Keduanya
 * diuji tersendiri — lihat test di bawah dan di Feature/Master.
 */
it('mengizinkan menghapus daftar bawaan sistem yang tidak dirujuk siapa pun', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());
    $this->seed(MasterDataSeeder::class);

    $this->deleteJson('/api/master/jenis/satuan')->assertOk();

    expect(MasterType::where('slug', 'satuan')->exists())->toBeFalse();
});

it('menolak menghapus daftar yang masih menjadi induk daftar lain', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisUji('Supplier Uji');
    jenisUji('Lot Uji', $supplier);

    $this->deleteJson("/api/master/jenis/{$supplier->slug}")->assertStatus(422);

    expect(MasterType::where('slug', $supplier->slug)->exists())->toBeTrue();
});

it('menolak jenis yang menjadi induk dirinya sendiri', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $jenis = jenisUji('Mesin');

    $this->putJson("/api/master/jenis/{$jenis->slug}", [
        'name' => 'Mesin',
        'parent_type_id' => $jenis->id,
    ])->assertStatus(422);
});

it('membuat kode isi daftar dari namanya', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $jenis = jenisUji('Mesin');

    $this->postJson("/api/master/{$jenis->slug}", ['name' => 'Oven Besar'])
        ->assertCreated()
        ->assertJsonPath('data.kode', 'OVEN_BESAR');
});

it('mewajibkan induk pada daftar yang berinduk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisUji('Supplier Uji');
    $lot = jenisUji('Lot Uji', $supplier);

    $this->postJson("/api/master/{$lot->slug}", ['name' => 'Lot Contoh'])
        ->assertStatus(422)
        ->assertJsonPath('errors.parent_id.0', 'Induk wajib dipilih.');
});

it('menolak induk yang berasal dari daftar lain', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisUji('Supplier Uji');
    $lot = jenisUji('Lot Uji', $supplier);
    $lain = jenisUji('Mesin');

    $salah = MasterData::factory()->create(['master_type_id' => $lain->id]);

    $this->postJson("/api/master/{$lot->slug}", [
        'name' => 'Lot Contoh',
        'parent_id' => $salah->id,
    ])->assertStatus(422);
});

it('menolak induk pada daftar yang tidak berinduk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $jenis = jenisUji('Mesin');
    $lain = MasterData::factory()->create(['master_type_id' => $jenis->id]);

    $this->postJson("/api/master/{$jenis->slug}", [
        'name' => 'Oven',
        'parent_id' => $lain->id,
    ])->assertStatus(422);
});

it('menyempitkan pencarian mengikuti induk yang dipilih', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisUji('Supplier Uji');
    $lot = jenisUji('Lot Uji', $supplier);

    $pertama = MasterData::factory()->create(['master_type_id' => $supplier->id]);
    $kedua = MasterData::factory()->create(['master_type_id' => $supplier->id]);

    MasterData::factory()->count(2)->create([
        'master_type_id' => $lot->id,
        'parent_id' => $pertama->id,
    ]);
    MasterData::factory()->create([
        'master_type_id' => $lot->id,
        'parent_id' => $kedua->id,
    ]);

    // Inilah yang mewujudkan "Supplier menyempitkan daftar LOT" (§1.2).
    $this->getJson("/api/master/{$lot->slug}/cari?induk_id={$pertama->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('tidak menawarkan baris nonaktif saat pencarian', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $jenis = jenisUji('Mesin');
    MasterData::factory()->create(['master_type_id' => $jenis->id, 'name' => 'Oven Aktif']);
    MasterData::factory()->nonaktif()->create([
        'master_type_id' => $jenis->id,
        'name' => 'Oven Pensiun',
    ]);

    $hasil = $this->getJson("/api/master/{$jenis->slug}/cari")->assertOk()->json('data');

    expect(collect($hasil)->pluck('nama')->all())->toBe(['Oven Aktif']);
});

it('membatasi jumlah hasil pencarian', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $jenis = jenisUji('Mesin');
    MasterData::factory()->count(30)->create(['master_type_id' => $jenis->id]);

    $this->getJson("/api/master/{$jenis->slug}/cari?batas=5")
        ->assertOk()
        ->assertJsonCount(5, 'data');

    // Batas yang diminta klien tetap dibatasi server.
    $this->getJson("/api/master/{$jenis->slug}/cari?batas=999")
        ->assertOk()
        ->assertJsonCount(30, 'data');
});

it('memaginate isi daftar', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $jenis = jenisUji('Mesin');
    MasterData::factory()->count(30)->create(['master_type_id' => $jenis->id]);

    $this->getJson("/api/master/{$jenis->slug}")
        ->assertOk()
        ->assertJsonCount(25, 'data')
        ->assertJsonPath('meta.total_data', 30);
});

it('menolak menghapus baris yang masih menjadi induk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisUji('Supplier Uji');
    $lot = jenisUji('Lot Uji', $supplier);

    $induk = MasterData::factory()->create(['master_type_id' => $supplier->id]);
    MasterData::factory()->create(['master_type_id' => $lot->id, 'parent_id' => $induk->id]);

    $this->deleteJson("/api/master/{$supplier->slug}/{$induk->id}")->assertStatus(422);
});

it('menjalankan seeder master berulang tanpa menggandakan data', function (): void {
    $this->seed(MasterDataSeeder::class);
    $jumlahJenis = MasterType::count();
    $jumlahIsi = MasterData::count();

    $this->seed(MasterDataSeeder::class);

    expect(MasterType::count())->toBe($jumlahJenis)
        ->and(MasterData::count())->toBe($jumlahIsi);
});

it('membuat daftar LOT berinduk supplier lewat seeder', function (): void {
    $this->seed(MasterDataSeeder::class);

    $lot = MasterType::where('slug', 'lot')->firstOrFail();

    expect($lot->induk?->slug)->toBe('supplier');
});
