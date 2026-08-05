<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\Permission;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\Tugas;
use App\Models\User;
use App\Support\Analitik\PenyaringAnalitik;
use App\Support\KatalogIzin;
use Database\Seeders\DepartmentSeeder;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

/**
 * Berkas terpenting pada modul ini.
 *
 * Executive Analytics punya **dua** jalur kebocoran, bukan satu:
 *
 * 1. Query yang lupa `visibleTo()` — pemegang jangkauan satu departemen membaca
 *    angka seluruh perusahaan, dan tidak ada yang terlihat salah di layar.
 * 2. Penyaring `departemen_id` yang dikirim pengguna sendiri — bila diterima
 *    apa adanya, siapa pun dapat meminta departemen mana pun.
 *
 * Keduanya diuji, dan diuji terhadap seseorang yang **boleh** membuka halaman
 * ini tetapi jangkauannya hanya satu departemen. Menguji Administrator saja
 * tidak membuktikan apa pun: jangkauannya Korporat, sehingga query yang bocor
 * pun memberi hasil yang sama benarnya.
 */

/**
 * @return array{pengawas: User, milik: Department, lain: Department, template: ReportTemplate}
 */
function siapkanAnalitik(): array
{
    test()->seed(DepartmentSeeder::class);

    $milik = Department::where('code', 'PRODUKSI')->firstOrFail();
    $lain = Department::where('code', 'QC')->firstOrFail();

    $pengawas = User::factory()->supervisor()->create([
        'department_id' => $milik->id,
        'name' => 'Pengawas Produksi',
    ]);
    $orangLain = User::factory()->staff()->create([
        'department_id' => $lain->id,
        'name' => 'Staf Quality Control',
    ]);

    $pengawas->roles->first()->permissions()->syncWithoutDetaching(
        Permission::where('key', KatalogIzin::ANALITIK_LIHAT)->pluck('id'),
    );

    $template = templateAngka();

    Tugas::factory()->create([
        'department_id' => $milik->id,
        'title' => 'Kartu milik sendiri',
        'penanggung_jawab_id' => $pengawas->id,
    ]);
    Tugas::factory()->create([
        'department_id' => $lain->id,
        'title' => 'Kartu departemen lain',
        'penanggung_jawab_id' => $orangLain->id,
    ]);

    Tugas::factory()->create([
        'department_id' => $milik->id,
        'title' => 'Telat milik sendiri',
        'target_selesai' => Carbon::today()->subDays(3),
    ]);
    Tugas::factory()->create([
        'department_id' => $lain->id,
        'title' => 'Telat departemen lain',
        'target_selesai' => Carbon::today()->subDays(3),
    ]);

    laporanAngka($pengawas, $milik, $template, 'selesai', 100);
    laporanAngka($orangLain, $lain, $template, 'dalam_proses', 250);

    return [
        'pengawas' => $pengawas->fresh(),
        'milik' => $milik,
        'lain' => $lain,
        'template' => $template,
    ];
}

/** Template berisi satu kolom angka bersatuan kilogram. */
function templateAngka(): ReportTemplate
{
    MasterType::factory()->create(['slug' => 'satuan_uji', 'name' => 'Satuan']);

    $template = ReportTemplate::create([
        'code' => 'UJI_ANALITIK',
        'name' => 'Uji Analitik',
        'department_id' => null,
        'is_active' => true,
    ]);

    $template->fields()->create([
        'key' => 'qty_masuk',
        'label' => 'QTY Masuk',
        'type' => TemplateField::TIPE_DECIMAL,
        'unit' => 'kg',
        'sort_order' => 0,
    ]);

    return $template->load('fields');
}

function laporanAngka(
    User $pengguna,
    Department $departemen,
    ReportTemplate $template,
    string $status,
    float $qty,
): DailyReport {
    $laporan = DailyReport::factory()->create([
        'user_id' => $pengguna->id,
        'department_id' => $departemen->id,
        'report_date' => Carbon::today(),
    ]);

    $bagian = $laporan->sections()->create([
        'report_template_id' => $template->id,
        'sort_order' => 0,
    ]);

    $bagian->items()->create([
        'data' => ['qty_masuk' => $qty],
        'progress_status' => $status,
        'sort_order' => 0,
    ]);

    return $laporan;
}

describe('penjagaan akses', function (): void {
    it('menolak seluruh halaman analitik tanpa izin', function (string $jalur): void {
        Sanctum::actingAs(User::factory()->staff()->create());

        $this->getJson("/api/analitik/{$jalur}")->assertForbidden();
    })->with(['opsi', 'ringkasan', 'kepatuhan', 'produktivitas', 'progres']);

    it('membuka tiap halaman bagi pemegang izinnya', function (string $jalur): void {
        Sanctum::actingAs(User::factory()->administrator()->create());

        $this->getJson("/api/analitik/{$jalur}")->assertOk();
    })->with(['opsi', 'ringkasan', 'kepatuhan', 'produktivitas', 'progres']);
});

describe('penyaring departemen tidak boleh memperluas jangkauan', function (): void {
    /*
     * Inilah jalur kebocoran yang baru: penyaringnya dikirim pengguna. Meminta
     * departemen di luar jangkauan harus dibuang diam-diam — menolaknya dengan
     * pesan "departemen itu di luar jangkauan Anda" pun sudah memberi tahu
     * bahwa departemen itu ada.
     */
    it('membuang departemen di luar jangkauan pada ringkasan', function (): void {
        ['pengawas' => $pengawas, 'lain' => $lain] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson("/api/analitik/ringkasan?departemen_id[]={$lain->id}")
            ->assertOk()
            ->json('data');

        // Permintaannya dibuang, sehingga penyaringnya kosong — dan yang
        // terbaca tetap hanya departemennya sendiri.
        expect($data['rentang']['departemen_id'])->toBe([])
            ->and(collect($data['status_per_departemen'])->pluck('departemen'))
            ->not->toContain($lain->name);
    });

    it('membuang departemen di luar jangkauan pada kepatuhan', function (): void {
        ['pengawas' => $pengawas, 'lain' => $lain] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson("/api/analitik/kepatuhan?departemen_id[]={$lain->id}")
            ->assertOk()
            ->json('data');

        expect(collect($data['per_orang'])->pluck('nama'))
            ->not->toContain('Staf Quality Control')
            ->and(collect($data['per_departemen'])->pluck('departemen'))
            ->not->toContain($lain->name);
    });

    it('membuang departemen di luar jangkauan pada produktivitas', function (): void {
        ['pengawas' => $pengawas, 'lain' => $lain] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson("/api/analitik/produktivitas?departemen_id[]={$lain->id}")
            ->assertOk()
            ->json('data');

        // 100 kg miliknya sendiri; 250 kg milik departemen lain tidak ikut.
        expect($data['data']['ringkasan']['total'])->toEqual(100);
    });

    it('menghormati penyaring departemen yang memang di dalam jangkauan', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        ['milik' => $milik, 'lain' => $lain] = siapkanAnalitik();

        $data = $this->getJson("/api/analitik/produktivitas?departemen_id[]={$milik->id}")
            ->assertOk()
            ->json('data');

        expect($data['rentang']['departemen_id'])->toBe([$milik->id])
            ->and($data['data']['ringkasan']['total'])->toEqual(100);

        $keduanya = $this->getJson(
            "/api/analitik/produktivitas?departemen_id[]={$milik->id}&departemen_id[]={$lain->id}",
        )->assertOk()->json('data');

        expect($keduanya['data']['ringkasan']['total'])->toEqual(350);
    });

    it('hanya menawarkan departemen yang terjangkau pada daftar pilihan', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'lain' => $lain] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $nama = collect($this->getJson('/api/analitik/opsi')->assertOk()->json('data.departemen'))
            ->pluck('nama');

        expect($nama)->toContain($milik->name)
            ->and($nama)->not->toContain($lain->name);
    });
});

describe('jangkauan data pada tiap angka', function (): void {
    it('tidak membocorkan kartu departemen lain', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson('/api/analitik/progres')->assertOk()->json('data');

        expect(collect($data['lewat_target'])->pluck('judul'))
            ->toContain('Telat milik sendiri')
            ->not->toContain('Telat departemen lain')
            ->and(collect($data['beban_penanggung_jawab'])->pluck('nama'))
            ->not->toContain('Staf Quality Control');
    });

    it('tidak membocorkan baris laporan departemen lain', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $sebaran = collect(
            $this->getJson('/api/analitik/progres')->assertOk()->json('data.sebaran_status_baris'),
        )->pluck('jumlah', 'status');

        expect($sebaran['selesai'])->toBe(1)
            ->and($sebaran['dalam_proses'])->toBe(0);
    });

    it('tidak membocorkan angka produksi departemen lain', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson('/api/analitik/produktivitas')->assertOk()->json('data');

        expect($data['data']['ringkasan']['total'])->toEqual(100)
            ->and(collect($data['data']['per_orang'])->pluck('nama'))
            ->not->toContain('Staf Quality Control');
    });

    it('tidak membocorkan orang departemen lain pada kepatuhan', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = $this->getJson('/api/analitik/kepatuhan')->assertOk()->json('data');

        $nama = collect($data['per_orang'])->pluck('nama');

        expect($nama)->toContain('Pengawas Produksi')
            ->and($nama)->not->toContain('Staf Quality Control');
    });

    it('menampilkan seluruh departemen bagi pemegang jangkauan Korporat', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        ['milik' => $milik, 'lain' => $lain] = siapkanAnalitik();

        $data = $this->getJson('/api/analitik/progres')->assertOk()->json('data');

        expect(collect($data['status_per_departemen'])->pluck('departemen'))
            ->toContain($milik->name)
            ->toContain($lain->name)
            ->and(collect($data['lewat_target'])->pluck('judul'))
            ->toContain('Telat milik sendiri')
            ->toContain('Telat departemen lain');
    });
});

describe('angka produktivitas', function (): void {
    /*
     * Metrik dikenali dari pasangan kunci **dan** satuan. Menjumlahkan kilogram
     * dengan pouch karena namanya mirip menghasilkan angka yang terlihat masuk
     * akal dan sepenuhnya salah.
     */
    it('tidak mencampur satuan yang berbeda meski kuncinya sama', function (): void {
        ['milik' => $milik] = siapkanAnalitik();

        $lain = ReportTemplate::create([
            'code' => 'UJI_POUCH',
            'name' => 'Uji Pouch',
            'department_id' => null,
            'is_active' => true,
        ]);
        $lain->fields()->create([
            'key' => 'qty_masuk',
            'label' => 'QTY Masuk',
            'type' => TemplateField::TIPE_INTEGER,
            'unit' => '/pouch 300g',
            'sort_order' => 0,
        ]);

        $pengguna = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($pengguna, $milik, $lain->load('fields'), 'selesai', 9000);

        Sanctum::actingAs(User::factory()->administrator()->create());

        $tersedia = collect(
            $this->getJson('/api/analitik/produktivitas')->assertOk()->json('data.metrik_tersedia'),
        );

        expect($tersedia->pluck('penanda'))
            ->toContain('qty_masuk|kg')
            ->toContain('qty_masuk|/pouch 300g');

        $kilogram = $this->getJson('/api/analitik/produktivitas?metrik=qty_masuk%7Ckg')
            ->assertOk()
            ->json('data.data.ringkasan.total');

        // 100 + 250 kg. Sembilan ribu pouch tidak ikut terjumlah.
        expect($kilogram)->toEqual(350);
    });

    it('menolak metrik yang tidak dikenal', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $this->getJson('/api/analitik/produktivitas?metrik=entah_apa%7Ckg')->assertStatus(422);
    });

    it('mengisi hari tanpa data dengan nol', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $perHari = $this->getJson('/api/analitik/produktivitas')
            ->assertOk()
            ->json('data.data.per_hari');

        /*
         * Grafik garis yang melompati tanggal kosong menyambungkan dua titik
         * berjauhan menjadi garis landai, dan yang terbaca justru kebalikan
         * dari keadaannya.
         */
        expect($perHari)->toHaveCount(30)
            ->and(collect($perHari)->where('nilai', 0.0)->count())->toBeGreaterThan(0);
    });
});

describe('rentang tanggal', function (): void {
    it('memakai 30 hari terakhir bila tidak diminta', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());

        $rentang = $this->getJson('/api/analitik/ringkasan')->assertOk()->json('data.rentang');

        expect($rentang['hari'])->toBe(30)
            ->and($rentang['sampai'])->toBe(Carbon::today()->toDateString());
    });

    it('membatasi jendela yang terlalu panjang', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());

        /*
         * Tanpa batas, satu permintaan dengan rentang sepuluh tahun membaca
         * seluruh arsip laporan — dan halaman ringkasan adalah tempat paling
         * mudah untuk tidak sengaja melakukannya.
         */
        $rentang = $this->getJson('/api/analitik/ringkasan?dari=2016-01-01&sampai=2026-08-05')
            ->assertOk()
            ->json('data.rentang');

        expect($rentang['hari'])->toBeLessThanOrEqual(PenyaringAnalitik::BATAS_HARI + 1);
    });

    it('membalik rentang yang tertukar alih-alih menolaknya', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());

        $rentang = $this->getJson('/api/analitik/ringkasan?dari=2026-08-05&sampai=2026-08-01')
            ->assertOk()
            ->json('data.rentang');

        expect($rentang['dari'])->toBe('2026-08-01')
            ->and($rentang['sampai'])->toBe('2026-08-05');
    });
});

describe('ringkasan eksekutif', function (): void {
    it('menyertakan pembanding periode sebelumnya', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $kartu = collect($this->getJson('/api/analitik/ringkasan')->assertOk()->json('data.kartu'));

        // Angka tanpa pembanding hampir tidak berarti.
        expect($kartu->pluck('kunci'))
            ->toContain('kepatuhan')
            ->toContain('laporan')
            ->and($kartu->firstWhere('kunci', 'laporan'))
            ->toHaveKey('sebelumnya');
    });

    it('menyebut yang perlu ditindaklanjuti dengan kalimat, bukan grafik', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $sorotan = collect(
            $this->getJson('/api/analitik/ringkasan')->assertOk()->json('data.sorotan'),
        );

        expect($sorotan)->not->toBeEmpty()
            ->and($sorotan->first())->toHaveKeys(['jenis', 'teks']);
    });
});

describe('peta panas kepatuhan', function (): void {
    it('memuat satu sel untuk tiap pasangan departemen dan hari', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $peta = $this->getJson('/api/analitik/kepatuhan?dari=2026-08-01&sampai=2026-08-05')
            ->assertOk()
            ->json('data.peta_panas');

        expect($peta['tanggal'])->toHaveCount(5);

        foreach ($peta['baris'] as $baris) {
            expect($baris['sel'])->toHaveCount(5);
        }
    });
});

describe('keadaan departemen', function (): void {
    /*
     * Halaman ini menjawab pertanyaan yang berbeda dari tab lain: bukan
     * seberapa rajin timnya, melainkan sedang mengerjakan apa. Ringkasannya
     * dibangkitkan dari template departemen masing-masing.
     */
    it('meringkas kolom angka bersatuan dari isi laporan', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        ['milik' => $milik] = siapkanAnalitik();

        $data = $this->getJson('/api/analitik/departemen')->assertOk()->json('data.departemen');

        $produksi = collect($data)->firstWhere('departemen', $milik->name);

        expect($produksi)->not->toBeNull()
            ->and($produksi['jumlah_laporan'])->toBe(1)
            ->and($produksi['jumlah_baris'])->toBe(1);

        $angka = collect($produksi['sorotan'])->firstWhere('jenis', 'angka');

        expect($angka['label'])->toBe('QTY Masuk')
            ->and($angka['satuan'])->toBe('kg')
            ->and($angka['total'])->toEqual(100);
    });

    it('menyebut nilai kolom master sebagai jawaban "untuk siapa"', function (): void {
        ['milik' => $milik] = siapkanAnalitik();

        $supplier = MasterType::factory()->create(['slug' => 'pembeli_uji', 'name' => 'Pembeli']);
        $alfa = MasterData::factory()->create([
            'master_type_id' => $supplier->id,
            'name' => 'PT Pembeli Alfa',
            'code' => 'BUY_ALFA',
        ]);

        $template = ReportTemplate::create([
            'code' => 'UJI_PEMBELI',
            'name' => 'Uji Pembeli',
            'department_id' => null,
            'is_active' => true,
        ]);
        $template->fields()->create([
            'key' => 'pembeli',
            'label' => 'Pembeli',
            'type' => TemplateField::TIPE_MASTER,
            'master_type_id' => $supplier->id,
            'sort_order' => 0,
        ]);

        $pengguna = User::factory()->staff()->create(['department_id' => $milik->id]);

        $laporan = DailyReport::factory()->create([
            'user_id' => $pengguna->id,
            'department_id' => $milik->id,
            'report_date' => Carbon::today()->subDay(),
        ]);
        $bagian = $laporan->sections()->create([
            'report_template_id' => $template->id,
            'sort_order' => 0,
        ]);
        $bagian->items()->create([
            'data' => ['pembeli' => ['kode' => $alfa->code, 'nama' => $alfa->name]],
            'progress_status' => 'dalam_proses',
            'sort_order' => 0,
        ]);

        Sanctum::actingAs(User::factory()->administrator()->create());

        $data = $this->getJson('/api/analitik/departemen')->assertOk()->json('data.departemen');
        $produksi = collect($data)->firstWhere('departemen', $milik->name);

        $master = collect($produksi['sorotan'])->firstWhere('jenis', 'master');

        expect($master['label'])->toBe('Pembeli')
            ->and(collect($master['nilai'])->pluck('teks'))->toContain('PT Pembeli Alfa');
    });

    it('menawarkan laporan terbaru untuk dibuka', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        ['milik' => $milik] = siapkanAnalitik();

        $data = $this->getJson('/api/analitik/departemen')->assertOk()->json('data.departemen');
        $produksi = collect($data)->firstWhere('departemen', $milik->name);

        expect($produksi['laporan'])->toHaveCount(1)
            ->and($produksi['laporan'][0])->toHaveKeys(['id', 'tanggal', 'penyusun', 'jumlah_baris']);
    });

    it('tidak membocorkan isi laporan departemen lain', function (): void {
        ['pengawas' => $pengawas, 'lain' => $lain] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = collect($this->getJson('/api/analitik/departemen')->assertOk()->json('data.departemen'));

        // Departemen lain tidak muncul sama sekali — bukan muncul dengan angka
        // nol, sebab angkanya pun sudah memberi tahu ada tidaknya kegiatan.
        expect($data->pluck('departemen'))->not->toContain($lain->name);

        $total = $data->sum('jumlah_baris');

        // Hanya satu baris miliknya sendiri; baris departemen lain tidak ikut.
        expect($total)->toBe(1);
    });

    it('menyebut departemen yang belum melapor, bukan menyembunyikannya', function (): void {
        Sanctum::actingAs(User::factory()->administrator()->create());
        siapkanAnalitik();

        $data = collect($this->getJson('/api/analitik/departemen')->assertOk()->json('data.departemen'));

        /*
         * Departemen tanpa laporan tetap muncul dengan jumlah nol. Justru
         * ketiadaan laporannya yang perlu terbaca — menghilangkannya membuat
         * halaman terlihat seolah semua departemen sudah melapor.
         */
        expect($data->where('jumlah_laporan', 0))->not->toBeEmpty();
    });
});
