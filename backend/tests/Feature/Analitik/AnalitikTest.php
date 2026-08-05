<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\Permission;
use App\Models\ReportTemplate;
use App\Models\Tugas;
use App\Models\User;
use App\Support\KatalogIzin;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

/**
 * Berkas terpenting pada rilis ini.
 *
 * Halaman ringkasan adalah jalur kebocoran data yang paling mudah terjadi: satu
 * query yang lupa `visibleTo()` membuat pemegang jangkauan satu departemen
 * membaca angka seluruh perusahaan, dan tidak ada yang terlihat salah di layar.
 * Karena itu **tiap angka** diuji tersendiri terhadap pemegang jangkauan
 * Departemen — bukan sekali di satu tempat lalu dianggap mewakili sisanya.
 */

/**
 * Dua departemen berisi kartu dan laporan, ditambah seorang pengawas yang
 * hanya berhak atas departemen pertama.
 *
 * @return array{pengawas: User, milik: Department, lain: Department}
 */
function siapkanAnalitik(): array
{
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    $milik = Department::where('code', 'PRODUKSI')->firstOrFail();
    $lain = Department::where('code', 'QC')->firstOrFail();

    $pengawas = User::factory()->supervisor()->create(['department_id' => $milik->id]);
    $orangLain = User::factory()->staff()->create(['department_id' => $lain->id]);

    /*
     * Inilah keadaan yang sebenarnya berbahaya, dan karena itu yang diuji:
     * seseorang yang **boleh** membuka Executive Analytics tetapi jangkauannya
     * hanya satu departemen. Menguji Administrator saja tidak membuktikan apa
     * pun — jangkauannya Korporat, sehingga query yang lupa `visibleTo()` pun
     * memberi hasil yang sama benarnya.
     */
    $pengawas->roles->first()->permissions()->syncWithoutDetaching(
        Permission::where('key', KatalogIzin::ANALITIK_LIHAT)->pluck('id'),
    );

    // Kartu di kedua departemen, judulnya sengaja mudah dibedakan.
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

    // Kartu lewat target di kedua departemen.
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

    laporanAnalitik($pengawas, $milik, 'selesai');
    laporanAnalitik($orangLain, $lain, 'dalam_proses');

    /*
     * `fresh()` wajib. `User::$with` memuat `roles.permissions` sejak model
     * dibuat, sehingga izin yang baru disinkronkan di atas tidak terlihat oleh
     * instance yang sudah ada di memori — dan `boleh()` menyimpan hasilnya.
     * Tanpa ini setiap permintaan berakhir 403, dan penyebabnya terlihat
     * seperti kesalahan otorisasi padahal hanya soal model basi.
     */
    return ['pengawas' => $pengawas->fresh(), 'milik' => $milik, 'lain' => $lain];
}

function laporanAnalitik(User $pengguna, Department $departemen, string $status): DailyReport
{
    $template = ReportTemplate::where('code', 'AKTIVITAS_UMUM')->firstOrFail();

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
        'data' => ['status' => $status],
        'progress_status' => $status,
        'sort_order' => 0,
    ]);

    return $laporan;
}

it('menolak Executive Analytics tanpa izin', function (): void {
    $pengguna = User::factory()->staff()->create();

    Sanctum::actingAs($pengguna);

    $this->getJson('/api/analitik')->assertForbidden();
});

it('membuka Executive Analytics bagi pemegang izinnya', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $this->getJson('/api/analitik')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'rentang' => ['dari', 'sampai', 'hari'],
                'status_per_departemen',
                'kepatuhan',
                'sebaran_status_baris',
                'beban_penanggung_jawab',
                'lewat_target',
            ],
        ]);
});

it('tidak membocorkan departemen lain pada sebaran kartu', function (): void {
    ['pengawas' => $pengawas, 'lain' => $lain] = siapkanAnalitik();

    Sanctum::actingAs($pengawas);

    $baris = collect($this->getJson('/api/analitik')->assertOk()->json('data.status_per_departemen'));

    /*
     * Departemen lain boleh saja tidak muncul sama sekali; yang dilarang adalah
     * munculnya dengan angka. Angka itulah yang membocorkan berapa banyak
     * pekerjaan berjalan di tim yang tidak boleh ia baca.
     */
    $lainnya = $baris->firstWhere('departemen', $lain->name);

    expect($baris->pluck('departemen'))->toContain('Produksi');

    if ($lainnya !== null) {
        expect(array_sum(array_diff_key($lainnya, ['departemen' => null])))->toBe(0);
    }
});

it('tidak membocorkan laporan departemen lain pada kepatuhan', function (): void {
    ['pengawas' => $pengawas] = siapkanAnalitik();

    Sanctum::actingAs($pengawas);

    $hariIni = collect($this->getJson('/api/analitik')->assertOk()->json('data.kepatuhan'))
        ->firstWhere('tanggal', Carbon::today()->toDateString());

    // Dua orang membuat laporan hari ini, tetapi hanya satu yang terlihat.
    expect($hariIni['melapor'])->toBe(1)
        // Penyebutnya pun terbatas jangkauan: anggota departemen lain tidak
        // ikut menaikkan angka wajib lapor.
        ->and($hariIni['wajib'])->toBe(1);
});

it('tidak membocorkan baris laporan departemen lain', function (): void {
    ['pengawas' => $pengawas] = siapkanAnalitik();

    Sanctum::actingAs($pengawas);

    $sebaran = collect($this->getJson('/api/analitik')->assertOk()->json('data.sebaran_status_baris'))
        ->pluck('jumlah', 'status');

    // Baris "selesai" miliknya sendiri terhitung; "dalam_proses" milik
    // departemen lain tidak.
    expect($sebaran['selesai'])->toBe(1)
        ->and($sebaran['dalam_proses'])->toBe(0);
});

it('tidak membocorkan beban orang di departemen lain', function (): void {
    ['pengawas' => $pengawas] = siapkanAnalitik();

    Sanctum::actingAs($pengawas);

    $nama = collect($this->getJson('/api/analitik')->assertOk()->json('data.beban_penanggung_jawab'))
        ->pluck('nama');

    expect($nama)->toContain($pengawas->name);

    $orangLain = User::where('department_id', '!=', $pengawas->department_id)
        ->whereNot('id', $pengawas->id)
        ->pluck('name');

    foreach ($orangLain as $satu) {
        expect($nama)->not->toContain($satu);
    }
});

it('tidak membocorkan kartu telat departemen lain', function (): void {
    ['pengawas' => $pengawas] = siapkanAnalitik();

    Sanctum::actingAs($pengawas);

    $judul = collect($this->getJson('/api/analitik')->assertOk()->json('data.lewat_target'))
        ->pluck('judul');

    expect($judul)->toContain('Telat milik sendiri')
        ->and($judul)->not->toContain('Telat departemen lain');
});

it('menampilkan seluruh departemen bagi pemegang jangkauan Korporat', function (): void {
    ['milik' => $milik, 'lain' => $lain] = siapkanAnalitik();

    Sanctum::actingAs(User::factory()->administrator()->create());

    $data = $this->getJson('/api/analitik')->assertOk()->json('data');

    expect(collect($data['status_per_departemen'])->pluck('departemen'))
        ->toContain($milik->name)
        ->toContain($lain->name)
        ->and(collect($data['lewat_target'])->pluck('judul'))
        ->toContain('Telat milik sendiri')
        ->toContain('Telat departemen lain');
});

it('mengisi seluruh hari pada rentang kepatuhan, termasuk yang kosong', function (): void {
    Sanctum::actingAs(User::factory()->administrator()->create());

    $kepatuhan = $this->getJson('/api/analitik')->assertOk()->json('data.kepatuhan');

    /*
     * Hari tanpa satu laporan pun wajib tetap muncul dengan angka nol. Grafik
     * garis yang melompati tanggal kosong menyambungkan dua titik berjauhan
     * menjadi garis landai, dan yang terbaca justru kebalikan dari keadaannya.
     */
    expect($kepatuhan)->toHaveCount(30)
        ->and($kepatuhan[0]['tanggal'])->toBe(Carbon::today()->subDays(29)->toDateString())
        ->and($kepatuhan[29]['tanggal'])->toBe(Carbon::today()->toDateString());
});
