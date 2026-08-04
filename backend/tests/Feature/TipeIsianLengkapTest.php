<?php

use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Support\DataExport;
use App\Support\ValidasiIsianTemplate;
use Illuminate\Support\Str;

/**
 * Menjaring tipe isian yang ditambahkan tetapi tidak disambungkan.
 *
 * Menambah tipe baru menuntut sentuhan di lima tempat: daftar `TIPE`, validasi
 * template, aturan saat laporan diisi, representasi export, dan kontrol di
 * antarmuka. Yang paling mudah terlewat dua di antaranya, dan keduanya gagal
 * tanpa suara: aturan yang hilang membuat kolom menerima apa saja, sedangkan
 * export yang hilang mengirim `Array` ke dalam sel Excel.
 *
 * Sisi validasi dijaga dengan membaca kode sumbernya — tiap tipe harus punya
 * cabangnya sendiri. Sisi export dijaga dengan menjalankannya sungguhan, karena
 * yang merusak berkas Excel bukan cabang yang hilang melainkan nilai yang
 * bukan skalar.
 */
function isiSumber(string $jalur): string
{
    return (string) file_get_contents($jalur);
}

it('menyebut setiap tipe isian pada aturan validasi pengisian', function (): void {
    $sumber = isiSumber((new ReflectionClass(ValidasiIsianTemplate::class))->getFileName());

    $terlewat = [];

    foreach (array_keys(TemplateField::TIPE) as $tipe) {
        $konstanta = 'TIPE_'.mb_strtoupper(str_replace('-', '_', $tipe));

        if (! str_contains($sumber, "TemplateField::{$konstanta}")) {
            $terlewat[] = $tipe;
        }
    }

    expect($terlewat)->toBe([]);
});

it('menghasilkan nilai export yang dapat ditulis ke sel untuk setiap tipe', function (): void {
    /*
     * Contoh nilai sesuai bentuk yang benar-benar tersimpan di
     * `daily_report_items.data`. Menambah tipe tanpa menambahkan contohnya di
     * sini akan menggagalkan pemeriksaan tepat di bawah — itulah yang memaksa
     * penulisnya memikirkan bentuk datanya.
     */
    $contoh = [
        TemplateField::TIPE_TEXT => 'Halo',
        TemplateField::TIPE_TEXTAREA => 'Keterangan panjang',
        TemplateField::TIPE_INTEGER => 12,
        TemplateField::TIPE_DECIMAL => 12.75,
        TemplateField::TIPE_DATE => '2026-08-04',
        TemplateField::TIPE_MONTH => '2026-08',
        TemplateField::TIPE_SELECT => 'selesai',
        TemplateField::TIPE_BOOLEAN => true,
        TemplateField::TIPE_MASTER => ['kode' => 'SUP_001', 'nama' => 'Pemasok Contoh'],
    ];

    expect(array_keys($contoh))->toEqualCanonicalizing(array_keys(TemplateField::TIPE));

    $template = ReportTemplate::create([
        'code' => 'UJI_TIPE_'.mb_strtoupper(Str::random(6)),
        'name' => 'Uji Tipe',
    ]);
    $data = [];

    foreach ($contoh as $tipe => $nilai) {
        $kunci = 'uji_'.$tipe;

        $template->fields()->create([
            'key' => $kunci,
            'label' => 'Uji '.$tipe,
            'type' => $tipe,
            'options' => $tipe === TemplateField::TIPE_SELECT
                ? [['nilai' => 'selesai', 'label' => 'Selesai']]
                : null,
        ]);

        $data[$kunci] = $nilai;
    }

    $method = new ReflectionMethod(DataExport::class, 'nilaiBaris');
    $hasil = $method->invoke(null, $data, $template->load('fields'));

    $bukanSkalar = array_keys(array_filter($hasil, fn ($nilai) => ! is_scalar($nilai)));

    // Nilai bukan skalar mendarat di Excel sebagai "Array" atau sel kosong —
    // gagal tanpa suara, dan baru ketahuan dari berkas yang sudah diserahkan.
    expect($bukanSkalar)->toBe([]);
    expect($hasil['uji_master'])->toBe('Pemasok Contoh');
});

it('tetap membaca kolom master yang barisnya masih berbentuk teks lama', function (): void {
    /*
     * Kolom yang tadinya `text` lalu diubah menjadi `master` meninggalkan
     * baris lama berisi string biasa. Laporan itu harus tetap terbaca
     * selamanya — pembersihan bentuk data tidak pernah dilakukan.
     */
    $template = ReportTemplate::create([
        'code' => 'UJI_TIPE_'.mb_strtoupper(Str::random(6)),
        'name' => 'Uji Tipe',
    ]);
    $template->fields()->create([
        'key' => 'pemasok',
        'label' => 'Pemasok',
        'type' => TemplateField::TIPE_MASTER,
    ]);

    $method = new ReflectionMethod(DataExport::class, 'nilaiBaris');
    $hasil = $method->invoke(null, ['pemasok' => 'Teks lama'], $template->load('fields'));

    expect($hasil['pemasok'])->toBe('Teks lama');
});

it('memakai daftar tipe yang tidak kosong', function (): void {
    // Kalau daftarnya kosong, kedua penjaga di atas lulus tanpa memeriksa apa pun.
    expect(TemplateField::TIPE)->not->toBeEmpty();
});
