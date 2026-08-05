<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\Tugas;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/** Pengawas sebuah departemen — jangkauan Departemen, melihat seisi timnya. */
function pengawasDepartemen(Department $departemen): User
{
    return User::factory()->supervisor()->create(['department_id' => $departemen->id]);
}

/**
 * Staf biasa — jangkauan **Pribadi**.
 *
 * Berbeda tajam dari pengawas: daftar departemennya kosong, sehingga
 * `mencakupDepartemen()` selalu bernilai salah. Aturan apa pun yang hanya diuji
 * memakai pengawas akan lolos meski Staf terkunci sama sekali.
 */
function stafDepartemen(Department $departemen): User
{
    return User::factory()->staff()->create(['department_id' => $departemen->id]);
}

it('menolak papan progres tanpa izin', function (): void {
    $pengguna = User::factory()->staff()->create();
    $pengguna->roles()->detach();

    Sanctum::actingAs($pengguna->fresh());

    $this->getJson('/api/tugas')->assertForbidden();
});

it('mengelompokkan kartu ke tiga kolom', function (): void {
    $departemen = Department::factory()->create();
    $pengguna = pengawasDepartemen($departemen);

    Tugas::factory()->create(['department_id' => $departemen->id]);
    Tugas::factory()->dalamProses()->create(['department_id' => $departemen->id]);
    Tugas::factory()->selesai()->count(2)->create(['department_id' => $departemen->id]);

    Sanctum::actingAs($pengguna);

    $kolom = $this->getJson('/api/tugas')->assertOk()->json('data');

    expect(collect($kolom)->pluck('status')->all())
        ->toBe(['belum_mulai', 'dalam_proses', 'selesai'])
        ->and(collect($kolom)->pluck('kartu')->map(fn ($k) => count($k))->all())
        ->toBe([1, 1, 2]);
});

/*
 * Papan progres adalah permukaan baru yang menampilkan pekerjaan orang lain.
 * Satu query yang lupa `visibleTo()` membuat supervisor satu departemen melihat
 * seluruh perusahaan.
 */
it('tidak menampilkan tugas departemen lain', function (): void {
    $milik = Department::factory()->create();
    $lain = Department::factory()->create();

    $pengguna = pengawasDepartemen($milik);

    Tugas::factory()->create(['department_id' => $milik->id, 'title' => 'Milik sendiri']);
    Tugas::factory()->create(['department_id' => $lain->id, 'title' => 'Milik orang lain']);

    Sanctum::actingAs($pengguna);

    $judul = collect($this->getJson('/api/tugas')->assertOk()->json('data'))
        ->flatMap(fn ($kolom) => collect($kolom['kartu'])->pluck('judul'))
        ->all();

    expect($judul)->toContain('Milik sendiri')
        ->and($judul)->not->toContain('Milik orang lain');
});

it('menolak membuat tugas di departemen di luar jangkauan', function (): void {
    $milik = Department::factory()->create();
    $lain = Department::factory()->create();

    Sanctum::actingAs(pengawasDepartemen($milik));

    $this->postJson('/api/tugas', [
        'title' => 'Menyusup',
        'department_id' => $lain->id,
    ])
        ->assertStatus(422)
        ->assertJsonPath('errors.department_id.0', 'Departemen tersebut di luar jangkauan Anda.');
});

/*
 * Staf berjangkauan Pribadi, sehingga `mencakupDepartemen()` selalu salah
 * baginya. Tanpa pengecualian "departemennya sendiri" di TugasRequest, ia
 * tertolak membuat kartu apa pun — padahal memasukkan progres harian justru
 * pekerjaannya, dan `tugas.kelola` sudah menjadi izin bawaannya.
 */
it('membolehkan staf membuat kartu di departemennya sendiri', function (): void {
    $departemen = Department::factory()->create();

    Sanctum::actingAs(stafDepartemen($departemen));

    $this->postJson('/api/tugas', [
        'title' => 'Menimbang bahan masuk',
        'department_id' => $departemen->id,
    ])->assertCreated();

    expect(Tugas::where('title', 'Menimbang bahan masuk')->exists())->toBeTrue();
});

it('menolak staf membuat kartu di departemen lain', function (): void {
    $milik = Department::factory()->create();
    $lain = Department::factory()->create();

    Sanctum::actingAs(stafDepartemen($milik));

    $this->postJson('/api/tugas', [
        'title' => 'Menyusup',
        'department_id' => $lain->id,
    ])->assertStatus(422);
});

/*
 * Jangkauan Pribadi tidak berarti "hanya yang saya buat". Kartu yang
 * ditanggung seseorang adalah pekerjaannya, siapa pun yang menuliskannya —
 * kalau tidak, kartu yang dibuatkan atasan tidak akan pernah terlihat olehnya.
 */
it('menampilkan kartu yang ditanggung staf meski dibuat orang lain', function (): void {
    $departemen = Department::factory()->create();
    $staf = stafDepartemen($departemen);

    Tugas::factory()->create([
        'department_id' => $departemen->id,
        'penanggung_jawab_id' => $staf->id,
        'title' => 'Ditugaskan kepada saya',
    ]);
    Tugas::factory()->create([
        'department_id' => $departemen->id,
        'title' => 'Pekerjaan rekan',
    ]);

    Sanctum::actingAs($staf);

    $judul = collect($this->getJson('/api/tugas')->assertOk()->json('data'))
        ->flatMap(fn ($kolom) => collect($kolom['kartu'])->pluck('judul'))
        ->all();

    expect($judul)->toContain('Ditugaskan kepada saya')
        ->and($judul)->not->toContain('Pekerjaan rekan');
});

it('menaruh kartu baru di puncak kolomnya', function (): void {
    $departemen = Department::factory()->create();
    $lama = Tugas::factory()->create(['department_id' => $departemen->id, 'urutan' => 0]);

    Sanctum::actingAs(stafDepartemen($departemen));

    $this->postJson('/api/tugas', [
        'title' => 'Yang baru dipikirkan',
        'department_id' => $departemen->id,
    ])->assertCreated();

    $baru = Tugas::where('title', 'Yang baru dipikirkan')->firstOrFail();

    expect($baru->urutan)->toBe(0)
        // Yang lama dirapatkan turun, bukan dibiarkan berbagi angka yang sama.
        ->and($lama->fresh()->urutan)->toBe(1);
});

it('memindahkan kartu antar kolom', function (): void {
    $departemen = Department::factory()->create();
    $tugas = Tugas::factory()->create(['department_id' => $departemen->id]);

    Sanctum::actingAs(pengawasDepartemen($departemen));

    $this->patchJson("/api/tugas/{$tugas->id}/geser", [
        'status' => 'selesai',
        'urutan' => 0,
    ])->assertOk();

    expect($tugas->fresh()->status)->toBe('selesai');
});

it('menolak memindahkan kartu di luar jangkauan', function (): void {
    $lain = Department::factory()->create();
    $tugas = Tugas::factory()->create(['department_id' => $lain->id]);

    Sanctum::actingAs(pengawasDepartemen(Department::factory()->create()));

    $this->patchJson("/api/tugas/{$tugas->id}/geser", [
        'status' => 'selesai',
        'urutan' => 0,
    ])->assertForbidden();
});

it('menolak kolom yang tidak dikenal', function (): void {
    $departemen = Department::factory()->create();
    $tugas = Tugas::factory()->create(['department_id' => $departemen->id]);

    Sanctum::actingAs(pengawasDepartemen($departemen));

    $this->patchJson("/api/tugas/{$tugas->id}/geser", [
        'status' => 'entah_apa',
        'urutan' => 0,
    ])->assertStatus(422);
});

it('menautkan tugas hanya ke laporan yang terlihat penautnya', function (): void {
    $milik = Department::factory()->create();
    $lain = Department::factory()->create();

    $pengguna = stafDepartemen($milik);

    $terlihat = DailyReport::factory()->create([
        'user_id' => $pengguna->id,
        'department_id' => $milik->id,
    ]);
    $tersembunyi = DailyReport::factory()->create([
        'user_id' => User::factory()->staff()->create(['department_id' => $lain->id])->id,
        'department_id' => $lain->id,
    ]);

    Sanctum::actingAs($pengguna);

    $this->postJson('/api/tugas', [
        'title' => 'Dengan bukti',
        'department_id' => $milik->id,
        'laporan_id' => [$terlihat->id, $tersembunyi->id],
    ])->assertCreated();

    $tugas = Tugas::where('title', 'Dengan bukti')->firstOrFail();

    // Laporan di luar jangkauan dibuang diam-diam, bukan diterima — menautkannya
    // membocorkan tanggalnya lewat balasan API.
    expect($tugas->laporan()->pluck('daily_reports.id')->all())->toBe([$terlihat->id]);
});

/*
 * Alasan tautannya menunjuk laporan, bukan baris laporan:
 * `DailyReportController::update()` menghapus seluruh `sections` lalu
 * membangunnya ulang, sehingga id baris tidak bertahan.
 */
it('mempertahankan tautan setelah laporannya disunting', function (): void {
    $departemen = Department::factory()->create();
    $pengguna = stafDepartemen($departemen);

    $laporan = DailyReport::factory()->create([
        'user_id' => $pengguna->id,
        'department_id' => $departemen->id,
    ]);
    $tugas = Tugas::factory()->create(['department_id' => $departemen->id]);
    $tugas->laporan()->attach($laporan->id);

    // Meniru penyuntingan: seluruh bagian dibuang lalu disusun ulang.
    $laporan->sections()->delete();

    expect($tugas->fresh()->laporan()->count())->toBe(1);
});

it('menghapus tugas tanpa menyentuh laporannya', function (): void {
    $departemen = Department::factory()->create();
    $pengguna = pengawasDepartemen($departemen);

    $laporan = DailyReport::factory()->create([
        'user_id' => $pengguna->id,
        'department_id' => $departemen->id,
    ]);
    $tugas = Tugas::factory()->create(['department_id' => $departemen->id]);
    $tugas->laporan()->attach($laporan->id);

    Sanctum::actingAs($pengguna);

    $this->deleteJson("/api/tugas/{$tugas->id}")->assertOk();

    expect(Tugas::count())->toBe(0)
        ->and(DailyReport::whereKey($laporan->id)->exists())->toBeTrue();
});
