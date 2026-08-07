<?php

use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\Permission;
use App\Models\User;
use App\Support\KatalogIzin;
use App\Support\ImportMaster;
use App\Support\SelAman;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Menyusun berkas `.xlsx` berisi baris yang diberikan.
 *
 * Baris ditulis apa adanya lewat `setCellValueExplicit` bertipe teks, supaya
 * sel yang sengaja dibuat berbahaya — `=1+1` — benar-benar sampai ke pembaca
 * dalam bentuk aslinya, bukan sudah diubah oleh penulis berkas ini.
 *
 * @param  list<list<string>>  $baris
 */
function berkasImport(array $judul, array $baris): UploadedFile
{
    $lembar = new Spreadsheet;
    $sheet = $lembar->getActiveSheet();
    $sheet->setTitle('Data');

    foreach ($judul as $index => $teks) {
        $sheet->setCellValue([$index + 1, 1], $teks);
    }

    foreach ($baris as $nomor => $isi) {
        foreach ($isi as $index => $nilai) {
            $sheet->setCellValueExplicit(
                [$index + 1, $nomor + 2],
                $nilai,
                DataType::TYPE_STRING,
            );
        }
    }

    $jalur = tempnam(sys_get_temp_dir(), 'import').'.xlsx';
    (new Xlsx($lembar))->save($jalur);

    return new UploadedFile($jalur, 'import.xlsx', null, null, true);
}

function jenisTanpaInduk(): MasterType
{
    return MasterType::factory()->create(['name' => 'Satuan', 'slug' => 'satuan']);
}

function pengelolaMaster(): User
{
    return User::factory()->administrator()->create();
}

/*
 * Staf kini memegang `master.kelola` secara bawaan — mengisi daftar master
 * memang pekerjaan unit kerja yang memakainya. Karena itu izinnya dicabut
 * secara eksplisit di sini: yang diuji adalah penolakan bagi yang TIDAK
 * memegang izin, bukan kebetulan bahwa perannya belum sempat memilikinya.
 */
it('menolak import tanpa izin mengelola', function (): void {
    $jenis = jenisTanpaInduk();

    $pengguna = User::factory()->staff()->create();
    $pengguna->roles->first()?->permissions()->detach(
        Permission::where('key', KatalogIzin::MASTER_KELOLA)->value('id'),
    );

    Sanctum::actingAs($pengguna->fresh());

    $this->post("/api/master/{$jenis->slug}/import/pratinjau", [
        'berkas' => berkasImport(['Nama *', 'Keterangan', 'Aktif'], [['Kilogram', '', 'Ya']]),
    ])->assertForbidden();
});

it('tidak menulis apa pun saat pratinjau', function (): void {
    $jenis = jenisTanpaInduk();

    Sanctum::actingAs(pengelolaMaster());

    $hasil = $this->post("/api/master/{$jenis->slug}/import/pratinjau", [
        'berkas' => berkasImport(
            ['Nama *', 'Keterangan', 'Aktif'],
            [['Kilogram', 'Satuan berat', 'Ya'], ['Liter', '', 'Tidak']],
        ),
    ])->assertOk()->json('data');

    expect($hasil['ringkasan']['baru'])->toBe(2)
        // Inilah seluruh guna langkah pratinjau: melihat tanpa mengubah apa pun.
        ->and(MasterData::count())->toBe(0);
});

it('menyimpan seluruh baris yang diterima', function (): void {
    $jenis = jenisTanpaInduk();

    Sanctum::actingAs(pengelolaMaster());

    $this->post("/api/master/{$jenis->slug}/import", [
        'berkas' => berkasImport(
            ['Nama *', 'Keterangan', 'Aktif'],
            [['Kilogram', 'Satuan berat', 'Ya'], ['Liter', '', 'Tidak']],
        ),
    ])->assertOk();

    expect(MasterData::count())->toBe(2)
        ->and(MasterData::where('name', 'Liter')->value('is_active'))->toBeFalse()
        // Kode dibuat server dari nama; kolomnya memang tidak ada di template.
        ->and(MasterData::where('name', 'Kilogram')->value('code'))->not->toBeEmpty();
});

it('memperbarui data yang namanya sudah ada, tanpa mengubah kodenya', function (): void {
    $jenis = jenisTanpaInduk();
    $lama = MasterData::factory()->create([
        'master_type_id' => $jenis->id,
        'name' => 'Kilogram',
        'code' => 'KG_LAMA',
        'description' => 'Keterangan lama',
    ]);

    Sanctum::actingAs(pengelolaMaster());

    $this->post("/api/master/{$jenis->slug}/import", [
        'berkas' => berkasImport(
            ['Nama *', 'Keterangan', 'Aktif'],
            [['Kilogram', 'Keterangan baru', 'Ya']],
        ),
    ])->assertOk();

    $lama->refresh();

    expect(MasterData::count())->toBe(1)
        ->and($lama->description)->toBe('Keterangan baru')
        /*
         * Kode tidak boleh ikut berubah. Laporan lama menyimpan salinan
         * `{kode, nama}`, dan kode itulah satu-satunya penanda yang
         * menyambungkan laporan dengan barisnya (§1.5).
         */
        ->and($lama->code)->toBe('KG_LAMA');
});

it('menolak baris bermasalah beserta alasannya, tanpa menggagalkan sisanya', function (): void {
    $jenis = jenisTanpaInduk();

    Sanctum::actingAs(pengelolaMaster());

    $berkas = fn () => berkasImport(
        ['Nama *', 'Keterangan', 'Aktif'],
        [
            ['Kilogram', '', 'Ya'],
            ['', 'Tanpa nama', 'Ya'],
            ['Kilogram', 'Kembar di berkas yang sama', 'Ya'],
            ['Liter', '', 'Ya'],
        ],
    );

    $hasil = $this->post("/api/master/{$jenis->slug}/import/pratinjau", ['berkas' => $berkas()])
        ->assertOk()
        ->json('data');

    expect($hasil['ringkasan'])->toMatchArray(['baru' => 2, 'perbarui' => 0, 'ditolak' => 2]);

    $ditolak = collect($hasil['baris'])->where('tindakan', 'ditolak')->values();

    expect($ditolak[0]['alasan'])->toBe('Nama belum diisi.')
        ->and($ditolak[1]['alasan'])->toContain('sudah ada di baris 2');

    $this->post("/api/master/{$jenis->slug}/import", ['berkas' => $berkas()])->assertOk();

    // Baris bermasalah dilewati; sisanya tetap tersimpan.
    expect(MasterData::pluck('name')->all())->toBe(['Kilogram', 'Liter']);
});

/*
 * Injeksi rumus Excel.
 *
 * Berkas hasil export dibuka orang lain — Direktur, GM — dan Excel menjalankan
 * sel yang diawali `=` sebagai rumus di komputer penerimanya. Nilainya harus
 * masuk sebagai teks, tetap tersimpan apa adanya, dan tetap menjadi teks saat
 * kelak diexport kembali.
 */
it('memperlakukan sel berawalan sama dengan sebagai teks', function (): void {
    $jenis = jenisTanpaInduk();

    Sanctum::actingAs(pengelolaMaster());

    $this->post("/api/master/{$jenis->slug}/import", [
        'berkas' => berkasImport(
            ['Nama *', 'Keterangan', 'Aktif'],
            [['Kilogram', '=1+1', 'Ya']],
        ),
    ])->assertOk();

    // Tersimpan apa adanya, tidak dihitung dan tidak dibuang.
    expect(MasterData::where('name', 'Kilogram')->value('description'))->toBe('=1+1');
});

it('tidak menyisakan baris apa pun bila penyimpanan gagal di tengah jalan', function (): void {
    $jenis = jenisTanpaInduk();

    /*
     * Kegagalannya dipaksakan lewat listener, bukan lewat data yang kebetulan
     * bermasalah. Semua bentuk data yang bermasalah sudah ditolak lebih dulu
     * oleh pemeriksaan, sehingga jalur itu tidak pernah sampai ke penyimpanan —
     * padahal justru kegagalan tak terduga di tengah penyimpanan yang membuat
     * transaksi diperlukan.
     *
     * Berkas dua ribu baris yang gagal di baris seribu meninggalkan separuh
     * data tersimpan, dan pengguna tidak punya cara mengetahui separuh mana.
     */
    MasterData::creating(function (MasterData $data): void {
        if ($data->name === 'Pemicu Gagal') {
            throw new RuntimeException('kegagalan buatan di tengah penyimpanan');
        }
    });

    Sanctum::actingAs(pengelolaMaster());

    try {
        $this->withoutExceptionHandling()->post("/api/master/{$jenis->slug}/import", [
            'berkas' => berkasImport(
                ['Nama *', 'Keterangan', 'Aktif'],
                [['Kilogram', '', 'Ya'], ['Pemicu Gagal', '', 'Ya'], ['Liter', '', 'Ya']],
            ),
        ]);

        $terlempar = false;
    } catch (RuntimeException) {
        $terlempar = true;
    } finally {
        MasterData::flushEventListeners();
    }

    expect($terlempar)->toBeTrue()
        // "Kilogram" sempat tersimpan sebelum kegagalan, dan wajib ikut hilang.
        ->and(MasterData::count())->toBe(0);
});

describe('daftar berinduk', function (): void {
    it('mencocokkan induk lewat nama maupun kodenya', function (): void {
        $supplier = MasterType::factory()->create(['name' => 'Supplier', 'slug' => 'supplier']);
        $lot = MasterType::factory()->create([
            'name' => 'LOT',
            'slug' => 'lot',
            'parent_type_id' => $supplier->id,
        ]);

        $satu = MasterData::factory()->create([
            'master_type_id' => $supplier->id,
            'name' => 'Pemasok Alfa',
            'code' => 'SUP_ALFA',
        ]);

        Sanctum::actingAs(pengelolaMaster());

        $this->post("/api/master/{$lot->slug}/import", [
            'berkas' => berkasImport(
                ['Nama *', 'Supplier *', 'Keterangan', 'Aktif'],
                [
                    ['LOT-001', 'Pemasok Alfa', '', 'Ya'],
                    ['LOT-002', 'SUP_ALFA', '', 'Ya'],
                    ['LOT-003', 'Pemasok Yang Tidak Ada', '', 'Ya'],
                ],
            ),
        ])->assertOk();

        expect(MasterData::where('master_type_id', $lot->id)->count())->toBe(2)
            ->and(MasterData::where('name', 'LOT-002')->value('parent_id'))->toBe($satu->id)
            // Induk yang tidak dikenal ditolak, bukan disimpan tanpa induk.
            ->and(MasterData::where('name', 'LOT-003')->exists())->toBeFalse();
    });
});

describe('berkas yang ditolak sejak awal', function (): void {
    it('menolak berkas yang bukan Excel', function (): void {
        $jenis = jenisTanpaInduk();

        Sanctum::actingAs(pengelolaMaster());

        $this->post("/api/master/{$jenis->slug}/import/pratinjau", [
            'berkas' => UploadedFile::fake()->create('daftar.pdf', 10, 'application/pdf'),
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.berkas.0', 'Berkas harus berupa Excel (.xlsx atau .xls).');
    });
});

describe('pemeriksaan dipakai bersama', function (): void {
    /*
     * Pratinjau dan penyimpanan wajib memakai pemeriksaan yang sama persis.
     * Dua jalur terpisah yang menghitung sendiri pasti berbeda di suatu titik,
     * dan begitu berbeda, langkah pratinjau berhenti berarti apa pun.
     */
    it('menghasilkan penilaian yang sama pada berkas yang sama', function (): void {
        $jenis = jenisTanpaInduk();
        MasterData::factory()->create(['master_type_id' => $jenis->id, 'name' => 'Kilogram']);

        $baris = [['Kilogram', 'Diperbarui', 'Ya'], ['', '', 'Ya'], ['Liter', '', 'Ya']];

        $hasil = ImportMaster::periksa(
            berkasImport(['Nama *', 'Keterangan', 'Aktif'], $baris),
            $jenis,
        );

        Sanctum::actingAs(pengelolaMaster());

        $lewatApi = $this->post("/api/master/{$jenis->slug}/import/pratinjau", [
            'berkas' => berkasImport(['Nama *', 'Keterangan', 'Aktif'], $baris),
        ])->assertOk()->json('data.ringkasan');

        expect($lewatApi)->toBe($hasil['ringkasan'])
            ->and($hasil['ringkasan'])->toMatchArray(['baru' => 1, 'perbarui' => 1, 'ditolak' => 1]);
    });
});

describe('berkas hasil export', function (): void {
    /*
     * Berkas yang keluar dari DAMS harus dapat dibaca kembali oleh DAMS.
     * Netralisasi rumus memakai penanda kutip pada gaya sel, bukan apostrof di
     * dalam nilainya — kalau apostrofnya ikut tersimpan, nilai akan berubah
     * tiap kali berkasnya diexport lalu diimpor lagi.
     */
    it('membaca kembali sel netral tanpa apostrof tambahan', function (): void {
        $lembar = new Spreadsheet;
        $sheet = $lembar->getActiveSheet();

        SelAman::tulis($sheet, [1, 1], '=1+1');
        SelAman::tulis($sheet, [2, 1], 'Teks biasa');

        $jalur = tempnam(sys_get_temp_dir(), 'netral').'.xlsx';
        (new Xlsx($lembar))->save($jalur);

        $dibaca = IOFactory::createReaderForFile($jalur)->load($jalur)->getActiveSheet();

        expect($dibaca->getCell([1, 1])->getValue())->toBe('=1+1')
            ->and($dibaca->getCell([2, 1])->getValue())->toBe('Teks biasa');
    });
});
