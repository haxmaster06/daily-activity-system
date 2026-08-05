<?php

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Template laporan sederhana dengan beberapa bentuk kolom sekaligus.
 *
 * Sengaja mencampur tipe: kolom hitungan, kolom master, kolom pilihan, dan
 * kolom angka desimal. Import yang hanya diuji dengan kolom teks akan lolos
 * meski seluruh penerjemahan nilainya salah.
 */
function templateImportLaporan(?Department $departemen = null): ReportTemplate
{
    $supplier = MasterType::factory()->create(['slug' => 'supplier_uji', 'name' => 'Supplier']);
    MasterData::factory()->create([
        'master_type_id' => $supplier->id,
        'name' => 'Pemasok Alfa',
        'code' => 'SUP_ALFA',
    ]);

    $template = ReportTemplate::create([
        'code' => 'UJI_IMPORT',
        'name' => 'Uji Import',
        'department_id' => $departemen?->id,
        'is_active' => true,
    ]);

    $kolom = [
        ['key' => 'kegiatan', 'label' => 'Kegiatan', 'type' => TemplateField::TIPE_TEXT, 'is_required' => true],
        ['key' => 'jumlah', 'label' => 'Jumlah', 'type' => TemplateField::TIPE_DECIMAL, 'desimal' => 2],
        ['key' => 'harga', 'label' => 'Harga', 'type' => TemplateField::TIPE_INTEGER],
        [
            'key' => 'status',
            'label' => 'Status',
            'type' => TemplateField::TIPE_SELECT,
            'options' => [
                ['nilai' => 'belum_mulai', 'label' => 'Belum Mulai'],
                ['nilai' => 'dalam_proses', 'label' => 'Dalam Proses'],
                ['nilai' => 'selesai', 'label' => 'Selesai'],
            ],
        ],
        [
            'key' => 'supplier',
            'label' => 'Supplier',
            'type' => TemplateField::TIPE_MASTER,
            'master_type_id' => $supplier->id,
        ],
        ['key' => 'lembur', 'label' => 'Lembur', 'type' => TemplateField::TIPE_BOOLEAN],
        // Kolom hitungan: tidak boleh muncul di berkas, dan nilainya diisi server.
        [
            'key' => 'total',
            'label' => 'Total',
            'type' => TemplateField::TIPE_DECIMAL,
            'computed_from' => 'jumlah * harga',
        ],
    ];

    foreach ($kolom as $urutan => $satu) {
        $template->fields()->create([...$satu, 'sort_order' => $urutan]);
    }

    return $template->load('fields');
}

function unduhTemplateLaporan(ReportTemplate $template): Spreadsheet
{
    $response = test()->get("/api/template/{$template->id}/import/template");
    $response->assertOk();

    $jalur = tempnam(sys_get_temp_dir(), 'tpl-laporan').'.xlsx';
    file_put_contents($jalur, $response->streamedContent());

    return IOFactory::createReaderForFile($jalur)->load($jalur);
}

/**
 * @param  list<list<string>>  $baris
 */
function berkasLaporan(array $judul, array $baris): UploadedFile
{
    $lembar = new Spreadsheet;
    $sheet = $lembar->getActiveSheet();
    $sheet->setTitle('Data');

    foreach ($judul as $index => $teks) {
        $sheet->setCellValue([$index + 1, 1], $teks);
    }

    foreach ($baris as $nomor => $isi) {
        foreach ($isi as $index => $nilai) {
            $sheet->setCellValueExplicit([$index + 1, $nomor + 2], $nilai, DataType::TYPE_STRING);
        }
    }

    $jalur = tempnam(sys_get_temp_dir(), 'laporan').'.xlsx';
    (new Xlsx($lembar))->save($jalur);

    return new UploadedFile($jalur, 'laporan.xlsx', null, null, true);
}

/** Judul kolom berkas: tanggal, lalu tiap kolom template kecuali hitungan. */
const JUDUL_UJI = ['Tanggal *', 'Kegiatan *', 'Jumlah', 'Harga', 'Status', 'Supplier', 'Lembur'];

function pengisiLaporan(?Department $departemen = null): User
{
    return User::factory()->staff()->create([
        'department_id' => $departemen?->id ?? Department::factory(),
    ]);
}

describe('template berkas', function (): void {
    it('tidak memuat kolom hitungan', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $data = unduhTemplateLaporan($template)->getSheetByName('Data');
        $judul = [];
        $terakhir = Coordinate::columnIndexFromString($data->getHighestDataColumn());

        for ($kolom = 1; $kolom <= $terakhir; $kolom++) {
            $judul[] = (string) $data->getCell([$kolom, 1])->getValue();
        }

        expect($judul)->toBe(JUDUL_UJI)
            /*
             * Kolom hitungan dihitung server dari kolom lain. Menyediakan
             * tempatnya hanya mengundang isian yang akan diabaikan — dan
             * pengisinya baru tahu setelah selesai mengetik seluruh berkas.
             */
            ->and($judul)->not->toContain('Total');
    });

    it('menyebut pilihan yang diterima pada lembar petunjuk', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $petunjuk = unduhTemplateLaporan($template)->getSheetByName('Petunjuk');
        $teks = '';

        for ($baris = 1; $baris <= $petunjuk->getHighestDataRow(); $baris++) {
            for ($kolom = 1; $kolom <= 3; $kolom++) {
                $teks .= (string) $petunjuk->getCell([$kolom, $baris])->getValue();
            }
        }

        expect($teks)->toContain('Dalam Proses')
            ->and($teks)->toContain('Pemasok Alfa')
            ->and($teks)->toContain('ditolak, bukan ditimpa');
    });

    it('menolak template milik departemen lain', function (): void {
        $milik = Department::factory()->create();
        $lain = Department::factory()->create();

        $template = templateImportLaporan($lain);

        Sanctum::actingAs(pengisiLaporan($milik));

        $this->get("/api/template/{$template->id}/import/template")
            ->assertForbidden()
            ->assertJsonPath('message', 'Template tersebut bukan milik departemen Anda.');
    });
});

describe('pratinjau', function (): void {
    it('tidak menulis apa pun', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $hasil = $this->post("/api/template/{$template->id}/import/pratinjau", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Menimbang bahan', '12,5', '1000', 'Selesai', 'Pemasok Alfa', 'Ya'],
                ['2026-08-01', 'Mengemas', '3', '500', 'Dalam Proses', 'SUP_ALFA', 'Tidak'],
                ['2026-08-02', 'Membersihkan mesin', '1', '0', 'Belum Mulai', '', ''],
            ]),
        ])->assertOk()->json('data');

        expect($hasil['ringkasan'])->toMatchArray([
            'diterima' => 3,
            'ditolak' => 0,
            'total' => 3,
            // Tiga baris, dua tanggal — satu laporan per tanggal.
            'laporan' => 2,
        ])
            ->and(DailyReport::count())->toBe(0)
            ->and(DailyReportItem::count())->toBe(0);
    });

    it('menyebut alasan tiap baris yang ditolak', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $hasil = $this->post("/api/template/{$template->id}/import/pratinjau", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['', 'Tanpa tanggal', '1', '1', 'Selesai', '', 'Ya'],
                ['2026-08-01', '', '1', '1', 'Selesai', '', 'Ya'],
                ['2026-08-01', 'Pilihan asing', '1', '1', 'Entah Apa', '', 'Ya'],
                ['2026-08-01', 'Supplier asing', '1', '1', 'Selesai', 'Pemasok Yang Tidak Ada', 'Ya'],
                ['2026-08-01', 'Angka salah', 'seratus', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertOk()->json('data');

        $alasan = collect($hasil['baris'])->pluck('alasan');

        expect($hasil['ringkasan']['ditolak'])->toBe(5)
            ->and($alasan[0])->toContain('Tanggal belum diisi')
            ->and($alasan[1])->toContain('Kegiatan wajib diisi')
            ->and($alasan[2])->toContain('bukan pilihan yang sah')
            ->and($alasan[3])->toContain('tidak ada pada daftar')
            ->and($alasan[4])->toContain('harus berupa angka');
    });

    /*
     * Tanggal yang sudah punya laporan ditolak, bukan ditimpa. Laporan itu
     * mungkin sudah dikirim dan ditinjau; menimpanya lewat berkas berarti
     * menghapus catatan yang sudah menjadi arsip, tanpa jejak.
     */
    it('menolak tanggal yang sudah punya laporan', function (): void {
        $template = templateImportLaporan();
        $pengguna = pengisiLaporan();

        DailyReport::factory()->create([
            'user_id' => $pengguna->id,
            'department_id' => $pengguna->department_id,
            'report_date' => '2026-08-01',
        ]);

        Sanctum::actingAs($pengguna);

        $hasil = $this->post("/api/template/{$template->id}/import/pratinjau", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Sudah ada', '1', '1', 'Selesai', '', 'Ya'],
                ['2026-08-02', 'Belum ada', '1', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertOk()->json('data');

        expect($hasil['ringkasan'])->toMatchArray(['diterima' => 1, 'ditolak' => 1])
            ->and($hasil['baris'][0]['alasan'])->toContain('sudah punya laporan');
    });
});

describe('penyimpanan', function (): void {
    it('membuat satu laporan draf per tanggal', function (): void {
        $template = templateImportLaporan();
        $pengguna = pengisiLaporan();

        Sanctum::actingAs($pengguna);

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Menimbang bahan', '12,5', '1000', 'Selesai', 'Pemasok Alfa', 'Ya'],
                ['2026-08-01', 'Mengemas', '3', '500', 'Dalam Proses', 'SUP_ALFA', 'Tidak'],
                ['2026-08-02', 'Membersihkan mesin', '1', '0', 'Belum Mulai', '', ''],
            ]),
        ])->assertOk();

        expect(DailyReport::count())->toBe(2)
            ->and(DailyReport::pluck('status')->unique()->all())->toBe(['draf'])
            ->and(DailyReportItem::count())->toBe(3);

        $pertama = DailyReport::whereDate('report_date', '2026-08-01')->firstOrFail();

        expect($pertama->sections()->count())->toBe(1)
            ->and($pertama->sections()->first()->items()->count())->toBe(2);
    });

    it('menerjemahkan tiap bentuk kolom ke nilai yang benar', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Menimbang bahan', '12,5', '1000', 'Selesai', 'Pemasok Alfa', 'Ya'],
            ]),
        ])->assertOk();

        $isi = DailyReportItem::firstOrFail();

        expect($isi->data['kegiatan'])->toBe('Menimbang bahan')
            // Koma diterima sebagai pemisah desimal — itu bentuk yang wajar di
            // Excel berlokal Indonesia.
            ->and($isi->data['jumlah'])->toBe(12.5)
            ->and($isi->data['harga'])->toBe(1000)
            // Yang disimpan nilainya, bukan labelnya.
            ->and($isi->data['status'])->toBe('selesai')
            ->and($isi->data['lembur'])->toBeTrue()
            // Kolom master menyimpan salinan {kode, nama}, bukan kunci asing.
            ->and($isi->data['supplier'])->toBe(['kode' => 'SUP_ALFA', 'nama' => 'Pemasok Alfa'])
            // Kolom hitungan tidak ada di berkas, tetapi tetap terisi server.
            ->and($isi->data['total'])->toEqual(12500)
            // Status baris ikut terisi supaya monitoring dan Analytics
            // membacanya seperti laporan yang diisi lewat layar.
            ->and($isi->progress_status)->toBe('selesai');
    });

    it('mencocokkan daftar master lewat nama maupun kode', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Lewat nama', '1', '1', 'Selesai', 'Pemasok Alfa', 'Ya'],
                ['2026-08-02', 'Lewat kode', '1', '1', 'Selesai', 'SUP_ALFA', 'Ya'],
            ]),
        ])->assertOk();

        expect(DailyReportItem::pluck('data')->pluck('supplier.kode')->unique()->all())
            ->toBe(['SUP_ALFA']);
    });

    it('melewati baris bermasalah tanpa menggagalkan sisanya', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Baris benar', '1', '1', 'Selesai', '', 'Ya'],
                ['2026-08-01', '', '1', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertOk();

        expect(DailyReportItem::count())->toBe(1)
            ->and(DailyReportItem::first()->data['kegiatan'])->toBe('Baris benar');
    });

    it('menolak berkas yang seluruh barisnya bermasalah', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['', 'Tanpa tanggal', '1', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertStatus(422);

        expect(DailyReport::count())->toBe(0);
    });

    it('membuat laporan atas nama pengunggahnya sendiri', function (): void {
        $template = templateImportLaporan();
        $pengguna = pengisiLaporan();
        $orangLain = pengisiLaporan();

        Sanctum::actingAs($pengguna);

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Punya saya', '1', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertOk();

        /*
         * Berkas tidak punya kolom pengguna, dan memang tidak boleh punya:
         * itu akan menjadi jalan memutar untuk mengisi laporan atas nama
         * orang lain.
         */
        expect(DailyReport::first()->user_id)->toBe($pengguna->id)
            ->and(DailyReport::where('user_id', $orangLain->id)->exists())->toBeFalse();
    });

    it('menolak import ke template departemen lain', function (): void {
        $milik = Department::factory()->create();
        $lain = Department::factory()->create();

        $template = templateImportLaporan($lain);

        Sanctum::actingAs(pengisiLaporan($milik));

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => berkasLaporan(JUDUL_UJI, [
                ['2026-08-01', 'Menyusup', '1', '1', 'Selesai', '', 'Ya'],
            ]),
        ])->assertForbidden();

        expect(DailyReport::count())->toBe(0);
    });
});

describe('bentuk tanggal', function (): void {
    /*
     * Excel menyimpan tanggal sebagai angka hari sejak 1900, dan pembacaan
     * hanya-data membuang gaya sel yang biasanya menandainya sebagai tanggal.
     * Tanpa penanganan itu, berkas yang tanggalnya diisi lewat pemilih tanggal
     * Excel akan ditolak seluruhnya — padahal itulah cara yang paling wajar.
     */
    it('menerima tanggal berbentuk angka Excel', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $lembar = new Spreadsheet;
        $sheet = $lembar->getActiveSheet();
        $sheet->setTitle('Data');

        foreach (JUDUL_UJI as $index => $teks) {
            $sheet->setCellValue([$index + 1, 1], $teks);
        }

        // 46235 = 1 Agustus 2026 pada penanggalan Excel.
        $serial = Date::PHPToExcel(
            Carbon::parse('2026-08-01')->toDateTime(),
        );

        $sheet->setCellValue([1, 2], $serial);
        $sheet->setCellValue([2, 2], 'Lewat pemilih tanggal');
        $sheet->setCellValue([5, 2], 'Selesai');

        $jalur = tempnam(sys_get_temp_dir(), 'serial').'.xlsx';
        (new Xlsx($lembar))->save($jalur);

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => new UploadedFile($jalur, 'serial.xlsx', null, null, true),
        ])->assertOk();

        expect(DailyReport::first()->report_date->toDateString())->toBe('2026-08-01');
    });
});

describe('template dapat dipakai apa adanya', function (): void {
    /*
     * Template yang tidak dapat dibaca kembali oleh sistem yang menerbitkannya
     * adalah cacat yang paling mudah lolos: keduanya diuji terpisah, dan
     * masing-masing terlihat benar.
     */
    it('diunduh, diisi, lalu diunggah kembali tanpa perubahan bentuk', function (): void {
        $template = templateImportLaporan();

        Sanctum::actingAs(pengisiLaporan());

        $lembar = unduhTemplateLaporan($template);
        $data = $lembar->getSheetByName('Data');

        // Dua baris contoh diganti isian sungguhan.
        $isi = [
            ['2026-08-01', 'Menimbang bahan', '12,5', '1000', 'Selesai', 'Pemasok Alfa', 'Ya'],
            ['2026-08-02', 'Mengemas', '3', '500', 'Dalam Proses', 'Pemasok Alfa', 'Tidak'],
        ];

        foreach ($isi as $nomor => $baris) {
            foreach ($baris as $index => $nilai) {
                $data->setCellValue([$index + 1, $nomor + 2], $nilai);
            }
        }

        $jalur = tempnam(sys_get_temp_dir(), 'terisi').'.xlsx';
        (new Xlsx($lembar))->save($jalur);

        $this->post("/api/template/{$template->id}/import", [
            'berkas' => new UploadedFile($jalur, 'terisi.xlsx', null, null, true),
        ])->assertOk();

        expect(DailyReport::count())->toBe(2)
            ->and(DailyReportItem::count())->toBe(2);
    });
});
