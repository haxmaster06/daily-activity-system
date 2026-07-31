<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * Angka pada dashboard tidak boleh mencakup laporan di luar jangkauan
 * pengguna. Kebocoran lewat angka ringkasan sama saja dengan kebocoran lewat
 * daftar — jumlah laporan departemen lain pun bukan hak Staff untuk tahu.
 */
function susunDataDashboard(): array
{
    $produksi = Department::factory()->create(['code' => 'PROD_D', 'name' => 'Produksi']);
    $qc = Department::factory()->create(['code' => 'QC_D', 'name' => 'QC']);

    $staff = User::factory()->staff()->create(['department_id' => $produksi->id]);
    $rekan = User::factory()->staff()->create(['department_id' => $produksi->id]);
    $orangQc = User::factory()->staff()->create(['department_id' => $qc->id]);

    DailyReport::factory()->milik($staff)->create(['report_date' => now()->toDateString()]);
    DailyReport::factory()->milik($rekan)->create(['report_date' => now()->toDateString()]);
    DailyReport::factory()->milik($orangQc)->create(['report_date' => now()->toDateString()]);

    return compact('produksi', 'qc', 'staff', 'rekan', 'orangQc');
}

it('menghitung laporan hari ini hanya sebatas jangkauan Staff', function (): void {
    $data = susunDataDashboard();
    Sanctum::actingAs($data['staff']);

    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kartu.laporan_hari_ini', 1);
});

it('menghitung laporan sedepartemen bagi Supervisor', function (): void {
    $data = susunDataDashboard();

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $data['produksi']->id]),
    );

    // Dua laporan Produksi, bukan tiga.
    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kartu.laporan_hari_ini', 2);
});

it('menghitung seluruh departemen bagi Manager', function (): void {
    susunDataDashboard();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kartu.laporan_hari_ini', 3);
});

it('menunjukkan laporan pengguna sendiri untuk hari ini', function (): void {
    $data = susunDataDashboard();
    Sanctum::actingAs($data['staff']);

    $response = $this->getJson('/api/dashboard')->assertOk();

    expect($response->json('data.laporan_saya_hari_ini.status'))->toBe('draf');
    expect($response->json('data.laporan_saya_hari_ini.dapat_disunting'))->toBeTrue();
});

it('mengembalikan null bila pengguna belum membuat laporan hari ini', function (): void {
    susunDataDashboard();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.laporan_saya_hari_ini', null);
});

it('tidak memberi daftar belum lapor kepada Staff', function (): void {
    $data = susunDataDashboard();
    Sanctum::actingAs($data['staff']);

    // Daftar rekan yang terlambat bukan hak Staff untuk tahu.
    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.belum_lapor', null);
});

it('memberi daftar belum lapor sebatas departemen Supervisor', function (): void {
    $data = susunDataDashboard();

    $belumLapor = User::factory()->staff()->create([
        'name' => 'Belum Melapor',
        'department_id' => $data['produksi']->id,
    ]);
    $belumLaporQc = User::factory()->staff()->create([
        'name' => 'Belum Melapor QC',
        'department_id' => $data['qc']->id,
    ]);

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $data['produksi']->id]),
    );

    $nama = collect($this->getJson('/api/dashboard')->json('data.belum_lapor'))->pluck('nama');

    expect($nama)->toContain('Belum Melapor')->not->toContain('Belum Melapor QC');
    expect($belumLapor->id)->not->toBe($belumLaporQc->id);
});

it('merekap status aktivitas dengan seluruh status walau nol', function (): void {
    susunDataDashboard();
    Sanctum::actingAs(User::factory()->manager()->create());

    $rekap = collect($this->getJson('/api/dashboard')->json('data.status_aktivitas'));

    // Status bernilai nol tetap ditampilkan; grafik yang kehilangan kategori
    // membuat pembacanya mengira kategori itu tidak ada.
    expect($rekap->pluck('status')->all())
        ->toBe(['belum_mulai', 'dalam_proses', 'selesai']);
});
