<?php

use App\Models\ReportDraft;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
 * Auto-save draf isian di latar. Intinya: payload SETENGAH terisi harus tetap
 * tersimpan — kalau ia dipaksa lewat validasi laporan resmi (kolom wajib),
 * jaring pemulihannya justru gagal persis saat paling dibutuhkan. Dan draf satu
 * orang tak boleh bocor ke orang lain.
 */

$payloadSetengah = [
    'tanggal' => '2026-08-21',
    'bagian' => [[
        'templateId' => 3,
        // Kolom wajib (mis. lot) sengaja kosong — form belum selesai diisi.
        'baris' => [['oven_masuk' => 120]],
    ]],
];

it('menyimpan payload setengah jadi tanpa menolaknya', function () use ($payloadSetengah): void {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/draf-laporan/baru', ['payload' => $payloadSetengah])
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->getJson('/api/draf-laporan/baru')
        ->assertOk()
        ->assertJsonPath('data.payload.bagian.0.baris.0.oven_masuk', 120);

    expect(ReportDraft::where('kunci', 'baru')->count())->toBe(1);
});

it('menimpa draf yang sama, tidak menggandakan', function () use ($payloadSetengah): void {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/draf-laporan/baru', ['payload' => $payloadSetengah])->assertOk();
    $this->putJson('/api/draf-laporan/baru', ['payload' => ['tanggal' => '2026-08-21', 'bagian' => []]])
        ->assertOk();

    expect(ReportDraft::where('kunci', 'baru')->count())->toBe(1);
});

it('membersihkan draf saat diminta', function () use ($payloadSetengah): void {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/draf-laporan/baru', ['payload' => $payloadSetengah])->assertOk();
    $this->deleteJson('/api/draf-laporan/baru')->assertOk();

    $this->getJson('/api/draf-laporan/baru')->assertOk()->assertJsonPath('data', null);
});

it('tidak membocorkan draf milik orang lain', function () use ($payloadSetengah): void {
    $pemilik = User::factory()->create();
    Sanctum::actingAs($pemilik);
    $this->putJson('/api/draf-laporan/baru', ['payload' => $payloadSetengah])->assertOk();

    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/draf-laporan/baru')->assertOk()->assertJsonPath('data', null);
});

it('menolak kunci yang tidak dikenal', function (): void {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/draf-laporan/sembarang')->assertNotFound();
    $this->putJson('/api/draf-laporan/DROP', ['payload' => []])->assertNotFound();
});

it('menerima kunci ubah dengan id laporan', function () use ($payloadSetengah): void {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/draf-laporan/ubah-64', ['payload' => $payloadSetengah])->assertOk();
    $this->getJson('/api/draf-laporan/ubah-64')
        ->assertOk()
        ->assertJsonPath('data.payload.tanggal', '2026-08-21');
});
