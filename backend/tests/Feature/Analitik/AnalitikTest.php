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
    })->with(['opsi', 'departemen', 'ringkasan', 'produktivitas', 'progres']);

    it('membuka tiap halaman bagi pemegang izinnya', function (string $jalur): void {
        Sanctum::actingAs(User::factory()->administrator()->create());

        $this->getJson("/api/analitik/{$jalur}")->assertOk();
    })->with(['opsi', 'departemen', 'ringkasan', 'produktivitas', 'progres']);
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

/**
 * Penyaringan bukan hanya departemen.
 *
 * Tiap parameter yang tampil di layar dapat dijadikan penyaring: status, orang,
 * template, dan rentang tanggal. Yang diuji di sini dua hal yang paling mudah
 * salah — bahwa tiap penyaring benar-benar **mempersempit**, dan bahwa beberapa
 * penyaring sekaligus tidak saling meniadakan. Penyaring yang diam-diam
 * diabaikan tidak menimbulkan galat apa pun; halamannya tampak wajar, hanya
 * menjawab pertanyaan yang berbeda dari yang ditanyakan.
 */
describe('penyaring selain departemen', function (): void {
    it('mempersempit menurut status baris laporan', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'template' => $template] = siapkanAnalitik();

        $rekan = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($rekan, $milik, $template, 'belum_mulai', 40);

        Sanctum::actingAs($pengawas);

        $tanpa = collect($this->getJson('/api/analitik/progres')->assertOk()
            ->json('data.sebaran_status_baris'));

        expect($tanpa->firstWhere('status', 'selesai')['jumlah'])->toBe(1)
            ->and($tanpa->firstWhere('status', 'belum_mulai')['jumlah'])->toBe(1);

        $tersaring = collect($this->getJson('/api/analitik/progres?status[]=selesai')->assertOk()
            ->json('data.sebaran_status_baris'));

        expect($tersaring->firstWhere('status', 'selesai')['jumlah'])->toBe(1)
            ->and($tersaring->firstWhere('status', 'belum_mulai')['jumlah'])->toBe(0);
    });

    it('mempersempit menurut penyusun laporan', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'template' => $template] = siapkanAnalitik();

        $rekan = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($rekan, $milik, $template, 'dalam_proses', 40);

        Sanctum::actingAs($pengawas);

        $produksi = fn (string $kueri) => collect(
            $this->getJson("/api/analitik/departemen{$kueri}")->assertOk()->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        expect($produksi('')['jumlah_laporan'])->toBe(2)
            ->and($produksi("?pengguna_id[]={$rekan->id}")['jumlah_laporan'])->toBe(1);
    });

    it('mempersempit menurut template laporan', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik] = siapkanAnalitik();

        $kedua = ReportTemplate::create([
            'code' => 'UJI_KEDUA',
            'name' => 'Uji Kedua',
            'department_id' => null,
            'is_active' => true,
        ]);
        $kedua->fields()->create([
            'key' => 'qty_masuk',
            'label' => 'QTY Masuk',
            'type' => TemplateField::TIPE_DECIMAL,
            'unit' => 'kg',
            'sort_order' => 0,
        ]);

        $rekan = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($rekan, $milik, $kedua->load('fields'), 'dalam_proses', 40);

        Sanctum::actingAs($pengawas);

        $produksi = fn (string $kueri) => collect(
            $this->getJson("/api/analitik/departemen{$kueri}")->assertOk()->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        expect($produksi('')['jumlah_laporan'])->toBe(2)
            ->and($produksi("?template_id[]={$kedua->id}")['jumlah_laporan'])->toBe(1);
    });

    it('mempersempit menurut tanggal tunggal', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'template' => $template] = siapkanAnalitik();

        $rekan = User::factory()->staff()->create(['department_id' => $milik->id]);
        $lalu = laporanAngka($rekan, $milik, $template, 'dalam_proses', 40);
        $lalu->update(['report_date' => Carbon::today()->subDays(5)]);

        Sanctum::actingAs($pengawas);

        $hariIni = Carbon::today()->toDateString();

        $data = collect(
            $this->getJson("/api/analitik/departemen?dari={$hariIni}&sampai={$hariIni}")
                ->assertOk()->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        expect($data['jumlah_laporan'])->toBe(1);
    });

    /*
     * Dua penyaring sekaligus harus berlaku bersama, bukan saling menimpa.
     * Kesalahan yang paling mungkin terjadi di sini adalah penyaring kedua
     * menghapus yang pertama — hasilnya tetap masuk akal di layar, dan tidak ada
     * cara mengetahuinya selain menghitung.
     */
    it('memberlakukan beberapa penyaring sekaligus', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'template' => $template] = siapkanAnalitik();

        $rekan = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($rekan, $milik, $template, 'belum_mulai', 40);

        Sanctum::actingAs($pengawas);

        $jumlah = fn (string $kueri) => collect(
            $this->getJson("/api/analitik/departemen{$kueri}")->assertOk()->json('data.departemen'),
        )->firstWhere('departemen', $milik->name)['jumlah_laporan'];

        // Orang yang benar dengan status yang benar-benar dimilikinya.
        expect($jumlah("?pengguna_id[]={$rekan->id}&status[]=belum_mulai"))->toBe(1);

        // Orang yang benar dengan status yang bukan miliknya — nol, bukan satu.
        expect($jumlah("?pengguna_id[]={$rekan->id}&status[]=selesai"))->toBe(0);
    });

    /*
     * Status karangan dibuang, bukan diteruskan ke `whereIn`. Diteruskan berarti
     * halaman kosong yang terlihat seperti "tidak ada datanya", padahal
     * permintaannya yang salah — dan pengguna akan mempercayai halaman itu.
     */
    it('mengabaikan status yang tidak dikenal alih-alih mengosongkan halaman', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $data = collect(
            $this->getJson('/api/analitik/departemen?status[]=entah_apa')->assertOk()
                ->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        expect($data['jumlah_laporan'])->toBe(1);
    });

    /*
     * Penyaring isi kolom — "tampilkan semua yang untuk pembeli ini". Satu-
     * satunya penyaring yang menyentuh isi JSON, dan karena itu satu-satunya
     * yang kuncinya ikut masuk ke jalur query.
     */
    it('mempersempit menurut isi kolom laporan', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik] = siapkanAnalitik();

        $jenis = MasterType::factory()->create(['slug' => 'pembeli_saring', 'name' => 'Pembeli']);
        $alfa = MasterData::factory()->create([
            'master_type_id' => $jenis->id,
            'name' => 'PT Pembeli Alfa',
            'code' => 'BUY_ALFA',
        ]);
        $beta = MasterData::factory()->create([
            'master_type_id' => $jenis->id,
            'name' => 'PT Pembeli Beta',
            'code' => 'BUY_BETA',
        ]);

        $template = ReportTemplate::create([
            'code' => 'UJI_SARING_NILAI',
            'name' => 'Uji Saring Nilai',
            'department_id' => null,
            'is_active' => true,
        ]);
        $template->fields()->create([
            'key' => 'pembeli',
            'label' => 'Pembeli',
            'type' => TemplateField::TIPE_MASTER,
            'master_type_id' => $jenis->id,
            'sort_order' => 0,
        ]);

        $penyusun = User::factory()->staff()->create(['department_id' => $milik->id]);

        // Satu laporan memuat dua baris: pembeli Alfa dan pembeli Beta.
        $laporan = DailyReport::factory()->create([
            'user_id' => $penyusun->id,
            'department_id' => $milik->id,
            'report_date' => Carbon::today(),
        ]);
        $bagian = $laporan->sections()->create([
            'report_template_id' => $template->id,
            'sort_order' => 0,
        ]);

        foreach ([$alfa, $beta] as $urutan => $pembeli) {
            $bagian->items()->create([
                'data' => ['pembeli' => ['kode' => $pembeli->code, 'nama' => $pembeli->name]],
                'progress_status' => 'dalam_proses',
                'sort_order' => $urutan,
            ]);
        }

        Sanctum::actingAs($pengawas);

        $produksi = collect(
            $this->getJson('/api/analitik/departemen?nilai[]=pembeli:BUY_ALFA')->assertOk()
                ->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        /*
         * Barisnya ikut menyempit, bukan hanya laporannya. Laporan yang lolos
         * memuat dua baris; menghitung keduanya membuat sorotan pembeli Alfa
         * memuat baris milik pembeli Beta.
         */
        expect($produksi['jumlah_baris'])->toBe(1);

        $master = collect($produksi['sorotan'])->firstWhere('jenis', 'master');

        expect(collect($master['nilai'])->pluck('teks'))
            ->toContain('PT Pembeli Alfa')
            ->not->toContain('PT Pembeli Beta');
    });

    /*
     * Kunci kolom ikut menyusun jalur JSON pada query, dan jalur itu tidak dapat
     * di-bind sebagai parameter. Kunci yang bukan pengenal biasa harus jatuh
     * sebelum menyentuh query mana pun — bukan menghasilkan galat SQL, dan
     * terlebih bukan dijalankan.
     */
    it('membuang kunci penyaring nilai yang tidak berbentuk pengenal', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $jahat = urlencode('a") = 1 OR JSON_EXTRACT(data, "$.x');

        $data = collect(
            $this->getJson("/api/analitik/departemen?nilai[]={$jahat}:apa")->assertOk()
                ->json('data.departemen'),
        )->firstWhere('departemen', $milik->name);

        // Permintaannya dijalankan seolah tanpa penyaring itu, bukan gagal.
        expect($data['jumlah_laporan'])->toBe(1);
    });

    it('menyempitkan penyebut kepatuhan saat disaring ke satu orang', function (): void {
        ['pengawas' => $pengawas, 'milik' => $milik, 'template' => $template] = siapkanAnalitik();

        // Sepuluh rekan yang tidak pernah mengisi apa pun. Tanpa penyebut yang
        // ikut menyempit, kepatuhan si pengisi rajin terbaca beberapa persen.
        User::factory()->count(10)->staff()->create(['department_id' => $milik->id]);

        $rajin = User::factory()->staff()->create(['department_id' => $milik->id]);
        laporanAngka($rajin, $milik, $template, 'selesai', 10);

        Sanctum::actingAs($pengawas);

        $hariIni = Carbon::today()->toDateString();
        $rentang = "dari={$hariIni}&sampai={$hariIni}";

        $kepatuhan = fn (string $kueri) => collect(
            $this->getJson("/api/analitik/ringkasan?{$kueri}")->assertOk()->json('data.kartu'),
        )->firstWhere('kunci', 'kepatuhan')['nilai'];

        expect($kepatuhan("{$rentang}&pengguna_id[]={$rajin->id}"))->toBe(100);
    });
});

describe('daftar pilihan penyaring', function (): void {
    it('menyebut seluruh nilai yang dapat dijadikan penyaring', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $this->getJson('/api/analitik/opsi')->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'departemen' => [['id', 'nama']],
                    'pengguna' => [['id', 'nama', 'departemen']],
                    'template' => [['id', 'nama', 'departemen_id']],
                    'status' => [['nilai', 'label']],
                    'metrik',
                    'batas_hari',
                ],
            ]);
    });

    /*
     * Daftar pilihan adalah jalur kebocoran tersendiri, dan yang paling mudah
     * terlupakan: angkanya boleh tersaring rapi, tetapi daftar namanya
     * membocorkan siapa saja yang bekerja di departemen lain.
     */
    it('tidak menyebut orang di luar jangkauan', function (): void {
        ['pengawas' => $pengawas] = siapkanAnalitik();

        Sanctum::actingAs($pengawas);

        $nama = collect($this->getJson('/api/analitik/opsi')->assertOk()->json('data.pengguna'))
            ->pluck('nama');

        expect($nama)->toContain('Pengawas Produksi')
            ->and($nama)->not->toContain('Staf Quality Control');
    });
});
