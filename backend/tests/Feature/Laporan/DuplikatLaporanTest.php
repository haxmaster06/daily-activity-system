<?php

use App\Models\DailyReport;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/*
 * Duplikat laporan mempercepat pengisian yang berulang tiap hari. Yang harus
 * dijaga: pekerjaannya tersalin, angkanya tidak — angka kemarin yang terbawa
 * diam-diam adalah data salah yang paling sulit terdeteksi, sebab bentuknya
 * benar dan letaknya benar.
 */

function templateDuplikat(): App\Models\ReportTemplate
{
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    return App\Models\ReportTemplate::where('code', 'AKTIVITAS_UMUM')->firstOrFail();
}

function laporanSumber(User $pemilik, array $isi): DailyReport
{
    $template = templateDuplikat();

    $laporan = DailyReport::create([
        'user_id' => $pemilik->id,
        'department_id' => $pemilik->department_id,
        'report_date' => now()->subDay()->toDateString(),
        'status' => DailyReport::STATUS_DIKIRIM,
    ]);

    $bagian = $laporan->sections()->create([
        'report_template_id' => $template->id,
        'sort_order' => 0,
    ]);

    $bagian->items()->create(['data' => $isi, 'sort_order' => 0]);

    return $laporan;
}

it('menyalin isian teks dan mengosongkan kolom angka', function (): void {
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $template = templateDuplikat();
    $angka = $template->fields->firstWhere(fn ($k) => $k->bertipeAngka());
    $teks = $template->fields->firstWhere(fn ($k) => $k->type === 'text');

    $sumber = laporanSumber($pengguna, [
        $teks->key => 'Membuat Id Card',
        ...($angka ? [$angka->key => 250] : []),
    ]);

    $hasil = $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->toDateString(),
    ])->assertCreated();

    $nilai = $hasil->json('data.bagian.0.baris.0.nilai');

    expect($nilai[$teks->key])->toBe('Membuat Id Card');

    if ($angka !== null) {
        expect($nilai[$angka->key])->toBeNull();
    }
});

it('mengosongkan status baris', function (): void {
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $sumber = laporanSumber($pengguna, ['status' => 'selesai']);

    $hasil = $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->toDateString(),
    ])->assertCreated();

    expect($hasil->json('data.bagian.0.baris.0.status'))->toBeNull();
});

it('membuat laporan baru berstatus draf, bukan mengubah sumbernya', function (): void {
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $sumber = laporanSumber($pengguna, ['status' => 'selesai']);

    $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->toDateString(),
    ])->assertCreated()->assertJsonPath('data.status', 'draf');

    expect($sumber->fresh()->status)->toBe(DailyReport::STATUS_DIKIRIM)
        ->and(DailyReport::where('user_id', $pengguna->id)->count())->toBe(2);
});

it('menolak bila tanggal tujuan sudah punya laporan', function (): void {
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $sumber = laporanSumber($pengguna, ['status' => 'selesai']);

    DailyReport::create([
        'user_id' => $pengguna->id,
        'department_id' => $pengguna->department_id,
        'report_date' => now()->toDateString(),
        'status' => DailyReport::STATUS_DRAF,
    ]);

    $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->toDateString(),
    ])->assertStatus(422);

    expect(DailyReport::where('user_id', $pengguna->id)->count())->toBe(2);
});

it('menolak tanggal yang belum terjadi', function (): void {
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $sumber = laporanSumber($pengguna, ['status' => 'selesai']);

    $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->addDay()->toDateString(),
    ])->assertStatus(422);
});

/*
 * Menyalin laporan orang lain akan menempatkan tulisan yang ditulis orang itu
 * di bawah nama penggunanya — dan pada catatan aktivitas harian, siapa menulis
 * apa adalah seluruh isinya.
 */
it('menolak menduplikat laporan milik orang lain', function (): void {
    $pemilik = User::factory()->staff()->create();
    $sumber = laporanSumber($pemilik, ['status' => 'selesai']);

    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson("/api/laporan/{$sumber->id}/duplikat", [
        'report_date' => now()->toDateString(),
    ])->assertForbidden();
});
