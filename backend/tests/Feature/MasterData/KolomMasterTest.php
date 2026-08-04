<?php

use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use App\Support\PindahkanSumberMaster;
use Database\Seeders\DepartmentSeeder;
use Laravel\Sanctum\Sanctum;

function jenisSupplier(): MasterType
{
    return MasterType::factory()->create(['name' => 'Supplier', 'slug' => 'supplier']);
}

it('menyimpan kolom yang mengambil pilihannya dari daftar master', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());
    $jenis = jenisSupplier();

    $this->postJson('/api/template', [
        'name' => 'Uji Kolom Master',
        'fields' => [[
            'key' => 'pemasok',
            'label' => 'Pemasok',
            'type' => 'master',
            'master_type_id' => $jenis->id,
        ]],
    ])->assertCreated();

    expect(TemplateField::where('key', 'pemasok')->first()->master_type_id)->toBe($jenis->id);
});

it('menolak kolom master tanpa daftar', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $response = $this->postJson('/api/template', [
        'name' => 'Uji Tanpa Daftar',
        'fields' => [['key' => 'pemasok', 'label' => 'Pemasok', 'type' => 'master']],
    ])->assertStatus(422);

    expect($response->json('errors')['fields.0.master_type_id'][0])
        ->toBe('Daftar master belum dipilih.');
});

it('menolak daftar master pada kolom yang bukan bertipe master', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());
    $jenis = jenisSupplier();

    $this->postJson('/api/template', [
        'name' => 'Uji Salah Tipe',
        'fields' => [[
            'key' => 'catatan',
            'label' => 'Catatan',
            'type' => 'text',
            'master_type_id' => $jenis->id,
        ]],
    ])->assertStatus(422);
});

it('menolak kolom penyaring yang tidak ada pada template yang sama', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisSupplier();
    $lot = MasterType::factory()->create([
        'name' => 'Nomor LOT',
        'slug' => 'lot',
        'parent_type_id' => $supplier->id,
    ]);

    $response = $this->postJson('/api/template', [
        'name' => 'Uji Penyaring Hilang',
        'fields' => [[
            'key' => 'nomor_lot',
            'label' => 'Nomor LOT',
            'type' => 'master',
            'master_type_id' => $lot->id,
            'master_induk_key' => 'pemasok',
        ]],
    ])->assertStatus(422);

    expect($response->json('errors')['fields.0.master_induk_key'][0])
        ->toBe('Kolom penyaring tidak ada pada template ini.');
});

it('menerima kolom penyaring yang mengambil pilihan dari daftar induk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisSupplier();
    $lot = MasterType::factory()->create([
        'name' => 'Nomor LOT',
        'slug' => 'lot',
        'parent_type_id' => $supplier->id,
    ]);

    $this->postJson('/api/template', [
        'name' => 'Uji Penyaring Benar',
        'fields' => [
            ['key' => 'pemasok', 'label' => 'Pemasok', 'type' => 'master', 'master_type_id' => $supplier->id],
            [
                'key' => 'nomor_lot',
                'label' => 'Nomor LOT',
                'type' => 'master',
                'master_type_id' => $lot->id,
                'master_induk_key' => 'pemasok',
            ],
        ],
    ])->assertCreated();
});

it('menolak kolom penyaring yang daftarnya bukan daftar induk', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $supplier = jenisSupplier();
    $lain = MasterType::factory()->create(['name' => 'Mesin', 'slug' => 'mesin']);
    $lot = MasterType::factory()->create([
        'name' => 'Nomor LOT',
        'slug' => 'lot',
        'parent_type_id' => $supplier->id,
    ]);

    $response = $this->postJson('/api/template', [
        'name' => 'Uji Penyaring Salah Daftar',
        'fields' => [
            ['key' => 'mesin', 'label' => 'Mesin', 'type' => 'master', 'master_type_id' => $lain->id],
            [
                'key' => 'nomor_lot',
                'label' => 'Nomor LOT',
                'type' => 'master',
                'master_type_id' => $lot->id,
                'master_induk_key' => 'mesin',
            ],
        ],
    ])->assertStatus(422);

    expect($response->json('errors')['fields.1.master_induk_key'][0])
        ->toBe('Kolom penyaring harus mengambil pilihannya dari daftar induk.');
});

/** Template berisi satu kolom master, siap diisi. */
function templateBerkolomMaster(MasterType $jenis): ReportTemplate
{
    $template = ReportTemplate::create(['code' => 'UJI_MASTER', 'name' => 'Uji Master']);

    $template->fields()->create([
        'key' => 'aktivitas',
        'label' => 'Aktivitas',
        'type' => 'text',
        'is_required' => true,
        'sort_order' => 0,
    ]);
    $template->fields()->create([
        'key' => 'pemasok',
        'label' => 'Pemasok',
        'type' => 'master',
        'master_type_id' => $jenis->id,
        'sort_order' => 1,
    ]);

    return $template;
}

it('menyimpan salinan kode dan nama, bukan kunci asing', function (): void {
    $jenis = jenisSupplier();
    $baris = MasterData::factory()->create([
        'master_type_id' => $jenis->id,
        'code' => 'PEMASOK_A',
        'name' => 'Pemasok A',
    ]);

    $template = templateBerkolomMaster($jenis);
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [[
                'aktivitas' => 'Menerima barang',
                'pemasok' => ['kode' => 'PEMASOK_A', 'nama' => 'Pemasok A'],
            ]],
        ]],
    ])->assertCreated();

    $tersimpan = DailyReportItem::first()->data['pemasok'];

    expect($tersimpan)->toBe(['kode' => 'PEMASOK_A', 'nama' => 'Pemasok A']);

    /*
     * Menghapus baris master tidak boleh mengubah laporan yang sudah tercatat.
     * Inilah alasan yang tersimpan salinan, bukan kunci asing.
     */
    $baris->delete();

    expect(DailyReportItem::first()->data['pemasok']['nama'])->toBe('Pemasok A');
});

it('menolak kode master yang tidak ada pada daftarnya', function (): void {
    $jenis = jenisSupplier();
    MasterData::factory()->create(['master_type_id' => $jenis->id, 'code' => 'PEMASOK_A']);

    $template = templateBerkolomMaster($jenis);
    Sanctum::actingAs(User::factory()->staff()->create());

    // Salinan pun tidak boleh dikarang klien lewat API.
    $response = $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [[
                'aktivitas' => 'Menerima barang',
                'pemasok' => ['kode' => 'TIDAK_ADA', 'nama' => 'Karangan'],
            ]],
        ]],
    ])->assertStatus(422);

    expect($response->json('errors'))->toHaveKey('sections.0.items.0.pemasok.kode');
});

it('menerima baris master yang sudah dinonaktifkan', function (): void {
    $jenis = jenisSupplier();
    MasterData::factory()->nonaktif()->create([
        'master_type_id' => $jenis->id,
        'code' => 'PEMASOK_LAMA',
        'name' => 'Pemasok Lama',
    ]);

    $template = templateBerkolomMaster($jenis);
    Sanctum::actingAs(User::factory()->staff()->create());

    // Menolaknya akan mengunci laporan yang isinya sudah benar sejak awal.
    $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [[
                'aktivitas' => 'Menerima barang',
                'pemasok' => ['kode' => 'PEMASOK_LAMA', 'nama' => 'Pemasok Lama'],
            ]],
        ]],
    ])->assertCreated();
});

it('memindahkan sumber master lama ke daftar padanannya', function (): void {
    $supplier = jenisSupplier();

    $template = ReportTemplate::create(['code' => 'UJI_PINDAH', 'name' => 'Uji Pindah']);
    $kolom = $template->fields()->create([
        'key' => 'pemasok',
        'label' => 'Pemasok',
        'type' => 'text',
        'lookup_source' => 'supplier',
    ]);
    $lain = $template->fields()->create([
        'key' => 'petugas',
        'label' => 'Petugas',
        'type' => 'text',
        'lookup_source' => 'pengguna',
    ]);

    $hasil = PindahkanSumberMaster::jalankan();

    expect($hasil['dipindahkan'])->toBe(1)
        ->and($hasil['dilewati'])->toBe(1)
        ->and($kolom->fresh()->master_type_id)->toBe($supplier->id)
        // Sumber tanpa daftar padanan dibiarkan apa adanya.
        ->and($lain->fresh()->master_type_id)->toBeNull();

    // Tipe sengaja tidak diubah — laporan lama berisi string biasa.
    expect($kolom->fresh()->type)->toBe('text');

    // Aman dijalankan berulang.
    expect(PindahkanSumberMaster::jalankan()['dipindahkan'])->toBe(0);
});

it('menolak kolom Status yang tipenya bukan pilihan', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    /*
     * Monitoring menyaring lewat `daily_report_items.progress_status` yang
     * hanya terisi bila kolom berkunci `status` bertipe pilihan. Mengubahnya
     * membuat penyaringan berhenti bekerja tanpa galat apa pun.
     */
    $response = $this->postJson('/api/template', [
        'name' => 'Uji Status',
        'fields' => [['key' => 'status', 'label' => 'Status', 'type' => 'text']],
    ])->assertStatus(422);

    expect($response->json('errors')['fields.0.type'][0])
        ->toContain('Kolom Status harus bertipe Pilihan');
});

it('tidak menagih laporan dari akun sistem', function (): void {
    $this->seed(DepartmentSeeder::class);

    $sistem = Department::where('code', Department::KODE_SISTEM)
        ->firstOrFail();
    $kerja = Department::where('is_system', false)->firstOrFail();

    $superadmin = User::factory()->administrator()->create([
        'department_id' => $sistem->id,
        'is_system' => true,
    ]);
    $staf = User::factory()->staff()->create(['department_id' => $kerja->id]);

    /*
     * Departemen sistem bukan unit kerja dan tidak punya pekerjaan harian
     * untuk dilaporkan. Menagihnya menghasilkan peringatan yang tidak pernah
     * dapat diselesaikan siapa pun.
     */
    $wajib = User::query()->wajibMelapor()->pluck('id');

    expect($wajib)->toContain($staf->id)
        ->and($wajib)->not->toContain($superadmin->id);
});

it('menyimpan pilihan majemuk sebagai daftar dan menolak isi di luar pilihan', function (): void {
    $template = ReportTemplate::create(['code' => 'UJI_MULTI', 'name' => 'Uji Multi']);
    $template->fields()->create([
        'key' => 'aktivitas',
        'label' => 'Aktivitas',
        'type' => 'text',
        'is_required' => true,
    ]);
    $template->fields()->create([
        'key' => 'mesin',
        'label' => 'Mesin',
        'type' => 'multiselect',
        'options' => [
            ['nilai' => 'oven', 'label' => 'Oven'],
            ['nilai' => 'ayak', 'label' => 'Ayak'],
        ],
    ]);

    Sanctum::actingAs(User::factory()->staff()->create());

    $muatan = fn (array $mesin) => [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [['aktivitas' => 'Produksi', 'mesin' => $mesin]],
        ]],
    ];

    $this->postJson('/api/laporan', $muatan(['oven', 'ayak']))->assertCreated();

    expect(DailyReportItem::first()->data['mesin'])->toBe(['oven', 'ayak']);

    // Tiap isi diperiksa terhadap daftar yang sama dengan pilihan tunggal.
    $this->postJson('/api/laporan', $muatan(['mesin_karangan']))->assertStatus(422);
});

it('menolak jam yang bukan format HH:MM', function (): void {
    $template = ReportTemplate::create(['code' => 'UJI_JAM', 'name' => 'Uji Jam']);
    $template->fields()->create(['key' => 'mulai', 'label' => 'Jam Mulai', 'type' => 'time']);

    Sanctum::actingAs(User::factory()->staff()->create());

    $kirim = fn (string $jam) => $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => [['mulai' => $jam]],
        ]],
    ]);

    $kirim('08:15')->assertCreated();
    $kirim('25:99')->assertStatus(422);
});
