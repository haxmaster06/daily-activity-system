<?php

use App\Models\Department;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Laravel\Sanctum\Sanctum;

/*
 * Proses Produksi diisi banyak pelapor. Penjaga identitas menolak satu catatan
 * fisik (kombinasi Tanggal Produksi + LOT) tercatat dua kali oleh orang berbeda,
 * supaya angka analitik tidak menggelembung.
 */

function templateProsesIdentitas(): ReportTemplate
{
    test()->seed(DepartmentSeeder::class);

    $template = ReportTemplate::create([
        'code' => 'PROD_PROSES',
        'name' => 'Proses Harian per LOT',
        'department_id' => Department::where('code', 'PRODUKSI')->value('id'),
        'is_active' => true,
    ]);

    $template->fields()->createMany([
        ['key' => 'tanggal_produksi', 'label' => 'Tanggal Produksi', 'type' => TemplateField::TIPE_DATE, 'sort_order' => 0],
        ['key' => 'lot', 'label' => 'LOT#', 'type' => TemplateField::TIPE_INTEGER, 'sort_order' => 1],
        ['key' => 'oven_keluar', 'label' => 'QTY Keluar', 'group_label' => 'Oven', 'unit' => 'kg', 'type' => TemplateField::TIPE_DECIMAL, 'sort_order' => 2],
    ]);

    return $template->load('fields');
}

function penggunaProduksi(): User
{
    return User::factory()->staff()->create([
        'department_id' => Department::where('code', 'PRODUKSI')->value('id'),
    ]);
}

function muatanProses(int $templateId, array $item): array
{
    return [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $templateId,
            'items' => [$item],
        ]],
    ];
}

it('menolak LOT + tanggal produksi yang sudah dicatat user lain', function (): void {
    $template = templateProsesIdentitas();

    Sanctum::actingAs(penggunaProduksi());
    $this->postJson('/api/laporan', muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 807, 'oven_keluar' => 100,
    ]))->assertCreated();

    Sanctum::actingAs(penggunaProduksi());
    $errors = $this->postJson('/api/laporan', muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 807, 'oven_keluar' => 90,
    ]))->assertStatus(422)->json('errors');

    expect($errors)->toHaveKey('sections.0.items.0')
        ->and($errors['sections.0.items.0'][0])->toContain('sudah dicatat');
});

it('mengizinkan LOT berbeda pada tanggal yang sama', function (): void {
    $template = templateProsesIdentitas();

    Sanctum::actingAs(penggunaProduksi());
    $this->postJson('/api/laporan', muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 807, 'oven_keluar' => 100,
    ]))->assertCreated();

    Sanctum::actingAs(penggunaProduksi());
    $this->postJson('/api/laporan', muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 808, 'oven_keluar' => 100,
    ]))->assertCreated();
});

it('menolak LOT dobel di dalam satu laporan', function (): void {
    $template = templateProsesIdentitas();

    Sanctum::actingAs(penggunaProduksi());
    $errors = $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [
                ['tanggal_produksi' => '2026-08-01', 'lot' => 900, 'oven_keluar' => 50],
                ['tanggal_produksi' => '2026-08-01', 'lot' => 900, 'oven_keluar' => 60],
            ],
        ]],
    ])->assertStatus(422)->json('errors');

    expect($errors)->toHaveKey('sections.0.items.1')
        ->and($errors['sections.0.items.1'][0])->toContain('lebih dari sekali');
});

it('mengizinkan pemilik menyunting laporannya sendiri dengan LOT yang sama', function (): void {
    $template = templateProsesIdentitas();

    Sanctum::actingAs(penggunaProduksi());
    $id = $this->postJson('/api/laporan', muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 807, 'oven_keluar' => 100,
    ]))->assertCreated()->json('data.id');

    $this->putJson("/api/laporan/{$id}", muatanProses($template->id, [
        'tanggal_produksi' => '2026-08-01', 'lot' => 807, 'oven_keluar' => 120,
    ]))->assertOk();
});
