<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('menolak Staff membuka monitoring', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/monitoring')
        ->assertForbidden()
        ->assertJsonPath('message', 'Anda tidak memiliki akses ke data ini.');
});

it('menghitung laporan tiap anggota dalam rentang', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);

    $rajin = User::factory()->staff()->create([
        'name' => 'Rajin Melapor',
        'department_id' => $departemen->id,
    ]);
    User::factory()->staff()->create([
        'name' => 'Belum Melapor',
        'department_id' => $departemen->id,
    ]);

    DailyReport::factory()->milik($rajin)->create(['report_date' => '2026-07-01']);
    DailyReport::factory()->milik($rajin)->dikirim()->create(['report_date' => '2026-07-02']);

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $departemen->id]),
    );

    $anggota = collect(
        $this->getJson('/api/monitoring?dari=2026-07-01&sampai=2026-07-03')->json('data.anggota'),
    )->keyBy('nama');

    expect($anggota['Rajin Melapor']['jumlah_laporan'])->toBe(2)
        ->and($anggota['Rajin Melapor']['jumlah_draf'])->toBe(1)
        ->and($anggota['Rajin Melapor']['hari_tanpa_laporan'])->toBe(1);

    expect($anggota['Belum Melapor']['jumlah_laporan'])->toBe(0)
        ->and($anggota['Belum Melapor']['hari_tanpa_laporan'])->toBe(3);
});

it('membatasi Supervisor pada departemennya walau meminta departemen lain', function (): void {
    $produksi = Department::factory()->create(['code' => 'PROD_M', 'name' => 'Produksi']);
    $qc = Department::factory()->create(['code' => 'QC_M', 'name' => 'QC']);

    User::factory()->staff()->create(['name' => 'Orang Produksi', 'department_id' => $produksi->id]);
    User::factory()->staff()->create(['name' => 'Orang QC', 'department_id' => $qc->id]);

    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $produksi->id]));

    // Meminta departemen lain secara terang-terangan pun tidak dilayani.
    $nama = collect(
        $this->getJson("/api/monitoring?departemen_id={$qc->id}")->json('data.anggota'),
    )->pluck('nama');

    expect($nama)->toContain('Orang Produksi')->not->toContain('Orang QC');
});

it('mengizinkan Manager menyaring per departemen', function (): void {
    $produksi = Department::factory()->create(['code' => 'PROD_M2', 'name' => 'Produksi']);
    $qc = Department::factory()->create(['code' => 'QC_M2', 'name' => 'QC']);

    User::factory()->staff()->create(['name' => 'Orang Produksi', 'department_id' => $produksi->id]);
    User::factory()->staff()->create(['name' => 'Orang QC', 'department_id' => $qc->id]);

    Sanctum::actingAs(User::factory()->manager()->create());

    $semua = collect($this->getJson('/api/monitoring')->json('data.anggota'))->pluck('nama');
    expect($semua)->toContain('Orang Produksi', 'Orang QC');

    $disaring = collect(
        $this->getJson("/api/monitoring?departemen_id={$qc->id}")->json('data.anggota'),
    )->pluck('nama');
    expect($disaring)->toContain('Orang QC')->not->toContain('Orang Produksi');
});

it('tidak menampilkan pengguna nonaktif', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);

    User::factory()->staff()->create(['name' => 'Masih Aktif', 'department_id' => $departemen->id]);
    User::factory()->staff()->nonaktif()->create([
        'name' => 'Sudah Nonaktif',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $departemen->id]));

    $nama = collect($this->getJson('/api/monitoring')->json('data.anggota'))->pluck('nama');

    expect($nama)->toContain('Masih Aktif')->not->toContain('Sudah Nonaktif');
});

it('menolak rentang tanggal yang terlalu panjang', function (): void {
    Sanctum::actingAs(User::factory()->supervisor()->create());

    // Satu permintaan tidak boleh memindai data bertahun-tahun.
    $response = $this->getJson('/api/monitoring?dari=2025-01-01&sampai=2026-12-31');

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('92 hari');
});

it('menolak tanggal akhir yang mendahului tanggal mulai', function (): void {
    Sanctum::actingAs(User::factory()->supervisor()->create());

    $this->getJson('/api/monitoring?dari=2026-07-10&sampai=2026-07-01')
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['sampai']]);
});

it('memakai bulan berjalan bila rentang tidak diminta', function (): void {
    Sanctum::actingAs(User::factory()->supervisor()->create());

    $rentang = $this->getJson('/api/monitoring')->json('data.rentang');

    expect($rentang['dari'])->toBe(now()->startOfMonth()->toDateString());
    expect($rentang['sampai'])->toBe(now()->toDateString());
});
