<?php

namespace App\Support;

use App\Models\MasterData;
use App\Models\MasterType;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Menyusun berkas `.xlsx` yang siap diisi lalu diunggah kembali.
 *
 * Template yang baik memindahkan pemeriksaan sejauh mungkin ke hulu: pilihan
 * yang salah ketahuan di Excel, sebelum berkasnya sempat diunggah. Karena itu
 * kolom berpilihan diberi validasi bawaan Excel, bukan sekadar dijelaskan di
 * lembar petunjuk.
 *
 * **Kolom kode sengaja tidak ada.** Kode dibuat server dari nama dan tidak
 * pernah berubah (`docs/standar-ui-ux.md` §1.5); menyediakan tempatnya hanya
 * mengundang isian yang akan diabaikan.
 *
 * Data contohnya jelas buatan. `Klien_Data/` tidak pernah masuk repository, dan
 * tidak boleh bocor lewat berkas contoh (CLAUDE.md).
 */
final class TemplateImportMaster
{
    /** Baris tempat judul kolom berada. */
    public const BARIS_HEADER = 1;

    /** Baris pertama yang dibaca sebagai data. */
    public const BARIS_DATA_PERTAMA = 2;

    /**
     * Jumlah baris yang diberi validasi Excel.
     *
     * Validasi hanya berlaku pada sel yang benar-benar diberi aturan, sehingga
     * jangkauannya perlu ditetapkan di muka. Seribu baris cukup untuk hampir
     * semua daftar master, dan tidak membuat berkasnya membengkak.
     */
    private const BARIS_BERVALIDASI = 1000;

    public static function untuk(MasterType $jenis): Spreadsheet
    {
        $lembar = new Spreadsheet;

        $data = $lembar->getActiveSheet();
        $data->setTitle('Data');

        $kolom = self::kolom($jenis);

        foreach ($kolom as $index => $satu) {
            $data->setCellValue([$index + 1, self::BARIS_HEADER], $satu['judul']);
            $data->getColumnDimensionByColumn($index + 1)->setWidth($satu['lebar']);
        }

        $data->getStyle([1, self::BARIS_HEADER, count($kolom), self::BARIS_HEADER])
            ->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '005BBF']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);

        // Header dibekukan supaya judul kolom tetap terlihat saat digulir.
        $data->freezePane([1, self::BARIS_DATA_PERTAMA]);

        self::isiContoh($data, $jenis, $kolom);
        self::pasangValidasi($data, $jenis, $kolom);

        self::lembarPetunjuk($lembar, $jenis, $kolom);

        // Lembar Data yang aktif saat berkasnya dibuka — bukan Petunjuk.
        $lembar->setActiveSheetIndex(0);

        return $lembar;
    }

    /**
     * Susunan kolom template.
     *
     * @return list<array{kunci: string, judul: string, lebar: int, wajib: bool, petunjuk: string}>
     */
    public static function kolom(MasterType $jenis): array
    {
        $kolom = [[
            'kunci' => 'nama',
            'judul' => 'Nama *',
            'lebar' => 32,
            'wajib' => true,
            'petunjuk' => 'Wajib diisi. Nama yang sudah ada akan diperbarui, bukan digandakan.',
        ]];

        if ($jenis->berinduk()) {
            $namaInduk = $jenis->induk?->name ?? 'Induk';

            $kolom[] = [
                'kunci' => 'induk',
                'judul' => "{$namaInduk} *",
                'lebar' => 28,
                'wajib' => true,
                'petunjuk' => "Wajib diisi. Harus sudah ada pada daftar {$namaInduk}. "
                    .'Boleh ditulis dengan nama atau kodenya.',
            ];
        }

        $kolom[] = [
            'kunci' => 'keterangan',
            'judul' => 'Keterangan',
            'lebar' => 40,
            'wajib' => false,
            'petunjuk' => 'Boleh dikosongkan. Maksimal 255 karakter.',
        ];

        $kolom[] = [
            'kunci' => 'aktif',
            'judul' => 'Aktif',
            'lebar' => 12,
            'wajib' => false,
            'petunjuk' => 'Isi "Ya" atau "Tidak". Dikosongkan berarti Ya. '
                .'Data nonaktif tidak lagi ditawarkan saat mengisi laporan, '
                .'tetapi laporan lama yang memakainya tetap menampilkannya.',
        ];

        return $kolom;
    }

    /**
     * Dua baris contoh yang jelas buatan.
     *
     * @param  list<array{kunci: string, judul: string, lebar: int, wajib: bool, petunjuk: string}>  $kolom
     */
    private static function isiContoh(Worksheet $sheet, MasterType $jenis, array $kolom): void
    {
        $induk = $jenis->berinduk()
            ? MasterData::where('master_type_id', $jenis->parent_type_id)
                ->orderBy('name')
                ->value('name')
            : null;

        $contoh = [
            [
                'nama' => 'Contoh Baris Pertama',
                'induk' => $induk ?? 'Isi nama induknya di sini',
                'keterangan' => 'Baris contoh — hapus sebelum mengunggah.',
                'aktif' => 'Ya',
            ],
            [
                'nama' => 'Contoh Baris Kedua',
                'induk' => $induk ?? 'Isi nama induknya di sini',
                'keterangan' => '',
                'aktif' => 'Tidak',
            ],
        ];

        foreach ($contoh as $nomor => $baris) {
            foreach ($kolom as $index => $satu) {
                // Lewat SelAman: nama induk berasal dari data yang diketik
                // pengguna, dan berkas ini dibuka di Excel.
                SelAman::tulis(
                    $sheet,
                    [$index + 1, self::BARIS_DATA_PERTAMA + $nomor],
                    $baris[$satu['kunci']] ?? '',
                );
            }
        }

        $sheet->getStyle([
            1,
            self::BARIS_DATA_PERTAMA,
            count($kolom),
            self::BARIS_DATA_PERTAMA + count($contoh) - 1,
        ])->getFont()->getColor()->setRGB('727785');
    }

    /**
     * Validasi bawaan Excel pada kolom berpilihan.
     *
     * @param  list<array{kunci: string, judul: string, lebar: int, wajib: bool, petunjuk: string}>  $kolom
     */
    private static function pasangValidasi(Worksheet $sheet, MasterType $jenis, array $kolom): void
    {
        $posisi = [];

        foreach ($kolom as $index => $satu) {
            $posisi[$satu['kunci']] = $index + 1;
        }

        self::daftarPilihan(
            $sheet,
            $posisi['aktif'],
            ['Ya', 'Tidak'],
            'Isi dengan Ya atau Tidak.',
        );

        if (! $jenis->berinduk()) {
            return;
        }

        $namaInduk = MasterData::where('master_type_id', $jenis->parent_type_id)
            ->orderBy('name')
            ->limit(200)
            ->pluck('name')
            ->all();

        /*
         * Excel membatasi panjang daftar pilihan tertulis sekitar 255 karakter.
         * Daftar induk yang panjang tidak dipasang sebagai validasi — lebih
         * baik tanpa validasi daripada berkas yang rusak saat dibuka.
         */
        if ($namaInduk !== [] && mb_strlen(implode(',', $namaInduk)) <= 250) {
            self::daftarPilihan(
                $sheet,
                $posisi['induk'],
                $namaInduk,
                'Pilih dari daftar yang sudah ada.',
            );
        }
    }

    /**
     * @param  list<string>  $pilihan
     */
    private static function daftarPilihan(
        Worksheet $sheet,
        int $kolom,
        array $pilihan,
        string $pesan,
    ): void {
        $validasi = (new DataValidation)
            ->setType(DataValidation::TYPE_LIST)
            ->setErrorStyle(DataValidation::STYLE_STOP)
            ->setAllowBlank(true)
            ->setShowDropDown(true)
            ->setShowErrorMessage(true)
            ->setErrorTitle('Isian tidak dikenali')
            ->setError($pesan)
            ->setFormula1('"'.implode(',', $pilihan).'"');

        /*
         * Dipasang sekali pada satu rentang, bukan sel per sel.
         *
         * Menyentuh seribu sel satu per satu memaksa PhpSpreadsheet membuat
         * seribu objek sel yang seluruhnya kosong, lalu menuliskannya ke
         * berkas. Berkasnya membengkak dan pembuatannya memakan waktu belasan
         * detik — untuk template yang isinya belum ada apa-apa.
         */
        $huruf = Coordinate::stringFromColumnIndex($kolom);

        $sheet->setDataValidation(
            "{$huruf}".self::BARIS_DATA_PERTAMA.":{$huruf}".self::BARIS_BERVALIDASI,
            $validasi,
        );
    }

    /**
     * Lembar penjelasan tiap kolom.
     *
     * @param  list<array{kunci: string, judul: string, lebar: int, wajib: bool, petunjuk: string}>  $kolom
     */
    private static function lembarPetunjuk(
        Spreadsheet $lembar,
        MasterType $jenis,
        array $kolom,
    ): void {
        $sheet = $lembar->createSheet();
        $sheet->setTitle('Petunjuk');

        $sheet->setCellValue([1, 1], "Cara mengisi daftar {$jenis->name}");
        $sheet->getStyle([1, 1])->getFont()->setBold(true)->setSize(14);

        $catatan = [
            'Isi mulai baris 2 pada lembar Data.',
            'Hapus dua baris contoh sebelum mengunggah berkasnya.',
            'Kode tidak perlu diisi — dibuat otomatis dari nama dan tidak pernah berubah.',
            'Nama yang sudah terdaftar akan diperbarui keterangannya, bukan digandakan.',
            'Setelah diunggah, isinya ditampilkan lebih dulu untuk diperiksa sebelum disimpan.',
        ];

        foreach ($catatan as $nomor => $baris) {
            $sheet->setCellValue([1, 3 + $nomor], '• '.$baris);
        }

        $barisTabel = 3 + count($catatan) + 2;

        $sheet->setCellValue([1, $barisTabel], 'Kolom');
        $sheet->setCellValue([2, $barisTabel], 'Penjelasan');
        $sheet->getStyle([1, $barisTabel, 2, $barisTabel])->getFont()->setBold(true);

        foreach ($kolom as $nomor => $satu) {
            $sheet->setCellValue([1, $barisTabel + 1 + $nomor], $satu['judul']);
            $sheet->setCellValue([2, $barisTabel + 1 + $nomor], $satu['petunjuk']);
        }

        $sheet->getColumnDimensionByColumn(1)->setWidth(28);
        $sheet->getColumnDimensionByColumn(2)->setWidth(90);
        $sheet->getStyle([2, $barisTabel + 1, 2, $barisTabel + count($kolom)])
            ->getAlignment()
            ->setWrapText(true);
    }
}
