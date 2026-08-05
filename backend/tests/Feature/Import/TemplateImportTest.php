<?php

use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Mengunduh template lalu membukanya kembali sebagai spreadsheet.
 */
function unduhTemplate(MasterType $jenis): Spreadsheet
{
    $response = test()->get("/api/master/{$jenis->slug}/template-import");
    $response->assertOk();

    $jalur = tempnam(sys_get_temp_dir(), 'template').'.xlsx';
    file_put_contents($jalur, $response->streamedContent());

    return IOFactory::createReaderForFile($jalur)->load($jalur);
}

/**
 * @return list<string>
 */
function judulKolom(Spreadsheet $lembar): array
{
    $sheet = $lembar->getSheetByName('Data');
    $judul = [];

    // `getHighestDataColumn()` mengembalikan huruf kolom, bukan angka.
    $terakhir = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

    for ($kolom = 1; $kolom <= $terakhir; $kolom++) {
        $nilai = $sheet->getCell([$kolom, 1])->getValue();

        if ($nilai !== null && $nilai !== '') {
            $judul[] = (string) $nilai;
        }
    }

    return $judul;
}

it('menolak template tanpa izin membaca daftar master', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    $pengguna = User::factory()->staff()->create();
    $pengguna->roles()->detach();

    Sanctum::actingAs($pengguna->fresh());

    $this->get("/api/master/{$jenis->slug}/template-import")->assertForbidden();
});

it('memuat seluruh kolom wajib dan tidak memuat kolom kode', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $judul = judulKolom(unduhTemplate($jenis));

    expect($judul)->toBe(['Nama *', 'Keterangan', 'Aktif']);

    /*
     * Kode dibuat server dari nama dan tidak pernah berubah (§1.5).
     * Menyediakan kolomnya hanya mengundang isian yang akan diabaikan — dan
     * pengisinya baru mengetahui itu setelah selesai mengetik seluruh berkas.
     */
    foreach ($judul as $satu) {
        expect(mb_strtolower($satu))->not->toContain('kode');
    }
});

it('menambahkan kolom induk pada daftar berinduk', function (): void {
    $supplier = MasterType::factory()->create(['slug' => 'supplier', 'name' => 'Supplier']);
    $lot = MasterType::factory()->create([
        'slug' => 'lot',
        'name' => 'LOT',
        'parent_type_id' => $supplier->id,
    ]);

    Sanctum::actingAs(User::factory()->administrator()->create());

    expect(judulKolom(unduhTemplate($lot)))->toBe([
        'Nama *',
        'Supplier *',
        'Keterangan',
        'Aktif',
    ]);
});

it('menyertakan dua baris contoh dan lembar petunjuk', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $lembar = unduhTemplate($jenis);
    $data = $lembar->getSheetByName('Data');

    expect($data->getCell([1, 2])->getValue())->toBe('Contoh Baris Pertama')
        ->and($data->getCell([1, 3])->getValue())->toBe('Contoh Baris Kedua')
        ->and($lembar->getSheetByName('Petunjuk'))->not->toBeNull();

    $petunjuk = $lembar->getSheetByName('Petunjuk');
    $teks = '';

    for ($baris = 1; $baris <= $petunjuk->getHighestDataRow(); $baris++) {
        $teks .= (string) $petunjuk->getCell([1, $baris])->getValue();
        $teks .= (string) $petunjuk->getCell([2, $baris])->getValue();
    }

    expect($teks)->toContain('Kode tidak perlu diisi')
        ->and($teks)->toContain('ditampilkan lebih dulu untuk diperiksa');
});

it('memasang validasi pilihan pada kolom Aktif', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $data = unduhTemplate($jenis)->getSheetByName('Data');

    /*
     * Validasi Excel dipasang supaya isian yang salah ketahuan di Excel,
     * sebelum berkasnya sempat diunggah. Kolom Aktif ada di urutan ketiga pada
     * daftar tanpa induk.
     */
    $validasi = $data->getCell([3, 2])->getDataValidation();

    expect($validasi->getType())->toBe('list')
        ->and($validasi->getFormula1())->toContain('Ya')
        ->and($validasi->getFormula1())->toContain('Tidak');
});

/*
 * Berkas contoh tidak boleh memuat data klien. `Klien_Data/` tidak pernah masuk
 * repository justru karena isinya nama karyawan, nama supplier, dan angka
 * produksi sungguhan (CLAUDE.md).
 */
it('memakai contoh yang jelas buatan, bukan data yang sudah ada', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    MasterData::factory()->create([
        'master_type_id' => $jenis->id,
        'name' => 'Data Sungguhan Yang Sudah Ada',
    ]);

    Sanctum::actingAs(User::factory()->administrator()->create());

    $data = unduhTemplate($jenis)->getSheetByName('Data');
    $teks = '';

    for ($baris = 2; $baris <= $data->getHighestDataRow(); $baris++) {
        for ($kolom = 1; $kolom <= 4; $kolom++) {
            $teks .= (string) $data->getCell([$kolom, $baris])->getValue();
        }
    }

    expect($teks)->toContain('Contoh Baris')
        ->and($teks)->not->toContain('Data Sungguhan Yang Sudah Ada');
});

it('dapat langsung diisi lalu diunggah kembali', function (): void {
    $jenis = MasterType::factory()->create(['slug' => 'satuan', 'name' => 'Satuan']);

    Sanctum::actingAs(User::factory()->administrator()->create());

    /*
     * Template yang tidak dapat dibaca kembali oleh sistem yang menerbitkannya
     * adalah cacat yang paling mudah lolos: keduanya diuji terpisah, dan
     * masing-masing terlihat benar.
     */
    $lembar = unduhTemplate($jenis);
    $data = $lembar->getSheetByName('Data');

    // Dua baris contoh diganti isian sungguhan, seperti yang dilakukan pengguna.
    $data->setCellValue([1, 2], 'Kilogram');
    $data->setCellValue([2, 2], 'Satuan berat');
    $data->setCellValue([3, 2], 'Ya');
    $data->setCellValue([1, 3], 'Liter');
    $data->setCellValue([2, 3], '');
    $data->setCellValue([3, 3], 'Tidak');

    $jalur = tempnam(sys_get_temp_dir(), 'diisi').'.xlsx';
    (new Xlsx($lembar))->save($jalur);

    $this->post("/api/master/{$jenis->slug}/import", [
        'berkas' => new UploadedFile($jalur, 'diisi.xlsx', null, null, true),
    ])->assertOk();

    expect(MasterData::pluck('name')->all())->toBe(['Kilogram', 'Liter'])
        ->and(MasterData::where('name', 'Liter')->value('is_active'))->toBeFalse();
});
