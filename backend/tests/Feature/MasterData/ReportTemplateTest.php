<?php

use App\Models\Department;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/**
 * @param  array<int, array<string, mixed>>  $kolomTambahan
 * @return array<string, mixed>
 */
function muatanTemplate(array $kolomTambahan = [], array $ganti = []): array
{
    return array_merge([
        'code' => 'UJI_TEMPLATE',
        'name' => 'Template Uji',
        'department_id' => null,
        'fields' => array_merge([
            ['key' => 'aktivitas', 'label' => 'Aktivitas', 'type' => 'textarea', 'is_required' => true],
        ], $kolomTambahan),
    ], $ganti);
}

it('menolak selain Administrator membuat template', function (): void {
    foreach (['staff', 'supervisor', 'manager'] as $peran) {
        Sanctum::actingAs(User::factory()->{$peran}()->create());

        $this->postJson('/api/template', muatanTemplate())->assertForbidden();

        lupakanAutentikasi();
    }

    expect(ReportTemplate::where('code', 'UJI_TEMPLATE')->exists())->toBeFalse();
});

it('mengizinkan semua pengguna membaca template', function (): void {
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/template')->assertOk();
});

it('membuat template beserta kolomnya', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate([
        ['key' => 'qty', 'label' => 'QTY', 'type' => 'decimal', 'unit' => 'kg'],
        [
            'key' => 'status',
            'label' => 'Status',
            'type' => 'select',
            'options' => [
                ['nilai' => 'selesai', 'label' => 'Selesai'],
                ['nilai' => 'proses', 'label' => 'Dalam Proses'],
            ],
        ],
    ]))
        ->assertCreated()
        ->assertJsonPath('message', 'Template berhasil dibuat.')
        ->assertJsonPath('data.kode', 'UJI_TEMPLATE')
        ->assertJsonCount(3, 'data.kolom');

    $template = ReportTemplate::where('code', 'UJI_TEMPLATE')->firstOrFail();

    // Urutan diambil dari posisi pada kiriman, bukan nilai dari klien.
    expect($template->fields()->pluck('sort_order')->all())->toBe([0, 1, 2]);
    expect($template->fields()->pluck('key')->all())->toBe(['aktivitas', 'qty', 'status']);
});

it('menolak template tanpa kolom', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', muatanTemplate([], ['fields' => []]));

    $response->assertStatus(422);
    expect($response->json('errors.fields.0'))->toBe('Template harus punya minimal satu kolom.');
});

it('menolak kunci kolom yang sama dua kali', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    // Kunci ganda membuat satu nilai menimpa nilai lain tanpa terlihat.
    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'aktivitas', 'label' => 'Aktivitas Lain', 'type' => 'text'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.1.key'][0])
        ->toBe('Kunci kolom sudah dipakai kolom lain pada template ini.');
});

it('menolak kunci kolom yang tidak sesuai bentuk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    foreach (['Aktivitas', 'no-spk', '1kolom', 'qty masuk'] as $kunci) {
        $this->postJson('/api/template', muatanTemplate([], [
            'fields' => [['key' => $kunci, 'label' => 'Uji', 'type' => 'text']],
        ]))->assertStatus(422);
    }
});

it('menolak kolom pilihan tanpa daftar pilihan', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'status', 'label' => 'Status', 'type' => 'select'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.1.options'][0])
        ->toBe('Kolom bertipe Pilihan harus punya minimal satu pilihan.');
});

it('menolak satuan pada kolom yang bukan angka', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'catatan', 'label' => 'Catatan', 'type' => 'text', 'unit' => 'kg'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.1.unit'][0])
        ->toBe('Satuan hanya berlaku untuk kolom angka.');
});

it('menolak nilai maksimum yang lebih kecil daripada minimum', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate([
        ['key' => 'qty', 'label' => 'QTY', 'type' => 'decimal', 'min_value' => 100, 'max_value' => 10],
    ]))
        ->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('menolak rumus yang menyebut kolom tidak dikenal', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    // Rumus yang menunjuk kolom tak ada akan gagal diam-diam saat laporan diisi.
    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'masuk', 'label' => 'Masuk', 'type' => 'decimal'],
        ['key' => 'sisa', 'label' => 'Sisa', 'type' => 'decimal', 'computed_from' => 'masuk - kolom_hantu'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.2.computed_from'][0])
        ->toContain('kolom_hantu');
});

it('menolak rumus yang menghitung kolomnya sendiri', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'masuk', 'label' => 'Masuk', 'type' => 'decimal'],
        ['key' => 'sisa', 'label' => 'Sisa', 'type' => 'decimal', 'computed_from' => 'sisa - masuk'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.2.computed_from'][0])
        ->toBe('Rumus tidak boleh menghitung kolomnya sendiri.');
});

it('menolak rumus pada kolom yang bukan angka', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', muatanTemplate([
        ['key' => 'masuk', 'label' => 'Masuk', 'type' => 'decimal'],
        ['key' => 'ringkasan', 'label' => 'Ringkasan', 'type' => 'text', 'computed_from' => 'masuk'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors')['fields.2.computed_from'][0])
        ->toBe('Kolom hitungan harus bertipe angka.');
});

it('menerima rumus yang seluruh kolomnya dikenal', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate([
        ['key' => 'masuk', 'label' => 'Masuk', 'type' => 'decimal'],
        ['key' => 'keluar', 'label' => 'Keluar', 'type' => 'decimal'],
        ['key' => 'waste', 'label' => 'Waste', 'type' => 'decimal', 'computed_from' => 'masuk - keluar'],
    ]))->assertCreated();

    $kolom = TemplateField::where('key', 'waste')->firstOrFail();

    expect($kolom->dihitungOtomatis())->toBeTrue();
});

it('menulis ulang kolom saat template diperbarui', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate([
        ['key' => 'lama', 'label' => 'Kolom Lama', 'type' => 'text'],
    ]))->assertCreated();

    $template = ReportTemplate::where('code', 'UJI_TEMPLATE')->firstOrFail();

    $this->putJson("/api/template/{$template->id}", muatanTemplate([
        ['key' => 'baru', 'label' => 'Kolom Baru', 'type' => 'text'],
    ]))->assertOk();

    expect($template->fields()->pluck('key')->all())->toBe(['aktivitas', 'baru']);
    expect(TemplateField::where('key', 'lama')->exists())->toBeFalse();
});

it('menghapus kolom saat templatenya dihapus', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate([
        ['key' => 'qty', 'label' => 'QTY', 'type' => 'decimal'],
    ]))->assertCreated();

    $template = ReportTemplate::where('code', 'UJI_TEMPLATE')->firstOrFail();

    $this->deleteJson("/api/template/{$template->id}")->assertOk();

    expect(TemplateField::where('report_template_id', $template->id)->exists())->toBeFalse();
});

it('menyaring template sesuai departemen dan tetap menyertakan yang berlaku umum', function (): void {
    $this->seed(DepartmentSeeder::class);
    $this->seed(ReportTemplateSeeder::class);

    $produksi = Department::where('code', 'PRODUKSI')->firstOrFail();
    Sanctum::actingAs(User::factory()->staff()->create(['department_id' => $produksi->id]));

    $kode = collect($this->getJson("/api/template?departemen_id={$produksi->id}")->json('data'))
        ->pluck('kode');

    expect($kode)
        ->toContain('PROD_SPK', 'PROD_PROSES')
        ->toContain('AKTIVITAS_UMUM')   // berlaku lintas departemen
        ->not->toContain('QC_LOT');
});

it('mengirim seluruh kolom template beserta grup dan satuannya', function (): void {
    $this->seed(DepartmentSeeder::class);
    $this->seed(ReportTemplateSeeder::class);

    Sanctum::actingAs(User::factory()->staff()->create());

    $template = ReportTemplate::where('code', 'PROD_PROSES')->firstOrFail();
    $data = $this->getJson("/api/template/{$template->id}")->assertOk()->json('data');

    $grup = collect($data['kolom'])->pluck('grup')->unique()->filter()->values();

    expect($grup)->toContain('Oven', 'Ayak', 'Packing 1', 'Xray', 'Packing 2');
    expect(collect($data['kolom'])->firstWhere('kunci', 'oven_masuk')['satuan'])->toBe('kg');
});

it('tidak menggandakan template saat seeder dijalankan berulang', function (): void {
    $this->seed(DepartmentSeeder::class);
    $this->seed(ReportTemplateSeeder::class);

    $jumlahTemplate = ReportTemplate::count();
    $jumlahKolom = TemplateField::count();

    $this->seed(ReportTemplateSeeder::class);

    expect(ReportTemplate::count())->toBe($jumlahTemplate);
    expect(TemplateField::count())->toBe($jumlahKolom);
});

it('menolak kode template yang sudah dipakai', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->postJson('/api/template', muatanTemplate())->assertCreated();

    $this->postJson('/api/template', muatanTemplate([], ['name' => 'Template Lain']))
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['code']]);
});
