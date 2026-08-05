<?php

namespace App\Support;

use App\Models\MasterData;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Template `.xlsx` untuk mengisi laporan harian di luar aplikasi.
 *
 * Bentuk kolomnya berbeda tiap template laporan, sehingga berkasnya dibangkitkan
 * dari `template_fields` — bukan ditulis satu per satu.
 *
 * **Kolom hitungan tidak ada.** Nilainya dihitung server dari kolom lain, dan
 * menyediakan tempatnya di berkas hanya mengundang isian yang akan diabaikan;
 * pengisinya baru mengetahui itu setelah selesai mengetik seluruh berkas.
 */
final class TemplateImportLaporan
{
    public const BARIS_HEADER = 1;

    public const BARIS_DATA_PERTAMA = 2;

    private const BARIS_BERVALIDASI = 1000;

    /** Kunci kolom tanggal. Bukan kolom template — ditambahkan import. */
    public const KUNCI_TANGGAL = '__tanggal__';

    public static function untuk(ReportTemplate $template): Spreadsheet
    {
        $lembar = new Spreadsheet;

        $data = $lembar->getActiveSheet();
        $data->setTitle('Data');

        $kolom = self::kolom($template);

        foreach ($kolom as $index => $satu) {
            $data->setCellValue([$index + 1, self::BARIS_HEADER], $satu['judul']);
            $data->getColumnDimensionByColumn($index + 1)->setWidth($satu['lebar']);
        }

        $data->getStyle([1, self::BARIS_HEADER, count($kolom), self::BARIS_HEADER])
            ->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '005BBF']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);

        $data->freezePane([1, self::BARIS_DATA_PERTAMA]);

        self::isiContoh($data, $kolom);
        self::pasangValidasi($data, $kolom);
        self::lembarPetunjuk($lembar, $template, $kolom);

        $lembar->setActiveSheetIndex(0);

        return $lembar;
    }

    /**
     * Susunan kolom berkas, dimulai dari tanggal.
     *
     * @return list<array{
     *     kunci: string, judul: string, lebar: int, wajib: bool,
     *     petunjuk: string, pilihan: list<string>, field: TemplateField|null
     * }>
     */
    public static function kolom(ReportTemplate $template): array
    {
        $kolom = [[
            'kunci' => self::KUNCI_TANGGAL,
            'judul' => 'Tanggal *',
            'lebar' => 14,
            'wajib' => true,
            'petunjuk' => 'Wajib diisi, bentuk 2026-08-05. Baris dengan tanggal yang sama '
                .'dikumpulkan menjadi satu laporan.',
            'pilihan' => [],
            'field' => null,
        ]];

        foreach ($template->fields as $field) {
            // Kolom hitungan sengaja tidak diberi tempat — lihat catatan kelas.
            if ($field->dihitungOtomatis()) {
                continue;
            }

            $kolom[] = [
                'kunci' => $field->key,
                'judul' => self::judul($field),
                'lebar' => self::lebar($field),
                'wajib' => (bool) $field->is_required,
                'petunjuk' => self::petunjuk($field),
                'pilihan' => self::pilihan($field),
                'field' => $field,
            ];
        }

        return $kolom;
    }

    private static function judul(TemplateField $field): string
    {
        $judul = $field->label;

        if ($field->unit) {
            $judul .= " ({$field->unit})";
        }

        return $field->is_required ? "{$judul} *" : $judul;
    }

    private static function lebar(TemplateField $field): int
    {
        return match ($field->type) {
            TemplateField::TIPE_TEXTAREA => 40,
            TemplateField::TIPE_MASTER, TemplateField::TIPE_MULTISELECT => 26,
            TemplateField::TIPE_BOOLEAN, TemplateField::TIPE_TIME => 12,
            TemplateField::TIPE_INTEGER, TemplateField::TIPE_DECIMAL => 14,
            default => 20,
        };
    }

    private static function petunjuk(TemplateField $field): string
    {
        $awal = $field->is_required ? 'Wajib diisi. ' : 'Boleh dikosongkan. ';

        $bentuk = match ($field->type) {
            TemplateField::TIPE_INTEGER => 'Angka bulat, tanpa pemisah ribuan.',
            TemplateField::TIPE_DECIMAL => sprintf(
                'Angka desimal, %d angka di belakang koma. Koma maupun titik diterima.',
                $field->desimal ?? 2,
            ),
            TemplateField::TIPE_DATE => 'Tanggal, bentuk 2026-08-05.',
            TemplateField::TIPE_MONTH => 'Bulan, bentuk 2026-08.',
            TemplateField::TIPE_TIME => 'Jam, bentuk 08:15.',
            TemplateField::TIPE_BOOLEAN => 'Isi "Ya" atau "Tidak".',
            TemplateField::TIPE_SELECT => 'Pilih salah satu dari daftar.',
            TemplateField::TIPE_MULTISELECT => 'Boleh lebih dari satu, dipisahkan titik koma.',
            TemplateField::TIPE_MASTER => 'Diambil dari daftar master. Boleh ditulis '
                .'dengan nama atau kodenya.',
            default => 'Teks bebas.',
        };

        $batas = '';

        if ($field->min_value !== null || $field->max_value !== null) {
            $batas = sprintf(
                ' Nilainya antara %s dan %s.',
                $field->min_value ?? 'bebas',
                $field->max_value ?? 'bebas',
            );
        }

        return $awal.$bentuk.$batas.($field->help_text ? ' '.$field->help_text : '');
    }

    /**
     * Pilihan yang sah untuk kolom berdaftar.
     *
     * @return list<string>
     */
    private static function pilihan(TemplateField $field): array
    {
        if ($field->type === TemplateField::TIPE_BOOLEAN) {
            return ['Ya', 'Tidak'];
        }

        if (in_array($field->type, [TemplateField::TIPE_SELECT, TemplateField::TIPE_MULTISELECT], true)) {
            return array_values(array_map(
                fn (array $satu) => (string) ($satu['label'] ?? $satu['nilai'] ?? ''),
                $field->options ?? [],
            ));
        }

        if ($field->bertipeMaster() && $field->master_type_id !== null) {
            return MasterData::where('master_type_id', $field->master_type_id)
                ->aktif()
                ->orderBy('name')
                ->limit(200)
                ->pluck('name')
                ->all();
        }

        return [];
    }

    /**
     * @param  list<array<string, mixed>>  $kolom
     */
    private static function isiContoh(Worksheet $sheet, array $kolom): void
    {
        foreach ([0, 1] as $nomor) {
            foreach ($kolom as $index => $satu) {
                SelAman::tulis(
                    $sheet,
                    [$index + 1, self::BARIS_DATA_PERTAMA + $nomor],
                    self::nilaiContoh($satu, $nomor),
                );
            }
        }

        $sheet->getStyle([
            1,
            self::BARIS_DATA_PERTAMA,
            count($kolom),
            self::BARIS_DATA_PERTAMA + 1,
        ])->getFont()->getColor()->setRGB('727785');
    }

    /**
     * @param  array<string, mixed>  $kolom
     */
    private static function nilaiContoh(array $kolom, int $nomor): string
    {
        if ($kolom['kunci'] === self::KUNCI_TANGGAL) {
            return now()->subDays(1 - $nomor)->toDateString();
        }

        if ($kolom['pilihan'] !== []) {
            return (string) ($kolom['pilihan'][$nomor] ?? $kolom['pilihan'][0]);
        }

        $field = $kolom['field'];

        return match ($field?->type) {
            TemplateField::TIPE_INTEGER => (string) (10 + $nomor),
            TemplateField::TIPE_DECIMAL => $nomor === 0 ? '12,5' : '8,25',
            TemplateField::TIPE_DATE => now()->toDateString(),
            TemplateField::TIPE_MONTH => now()->format('Y-m'),
            TemplateField::TIPE_TIME => $nomor === 0 ? '08:00' : '13:30',
            // Contoh yang jelas buatan — data klien tidak pernah masuk repo
            // maupun berkas yang dibagikan (CLAUDE.md).
            default => 'Contoh isian '.($nomor + 1),
        };
    }

    /**
     * @param  list<array<string, mixed>>  $kolom
     */
    private static function pasangValidasi(Worksheet $sheet, array $kolom): void
    {
        foreach ($kolom as $index => $satu) {
            /** @var list<string> $pilihan */
            $pilihan = $satu['pilihan'];

            if ($pilihan === []) {
                continue;
            }

            /*
             * Pilihan majemuk tidak diberi validasi daftar: isinya boleh lebih
             * dari satu, dipisahkan titik koma, dan validasi daftar Excel
             * justru akan menolak isian yang benar.
             */
            if ($satu['field']?->type === TemplateField::TIPE_MULTISELECT) {
                continue;
            }

            // Excel membatasi panjang daftar tertulis sekitar 255 karakter.
            // Lebih baik tanpa validasi daripada berkas yang rusak saat dibuka.
            if (mb_strlen(implode(',', $pilihan)) > 250) {
                continue;
            }

            $validasi = (new DataValidation)
                ->setType(DataValidation::TYPE_LIST)
                ->setErrorStyle(DataValidation::STYLE_STOP)
                ->setAllowBlank(true)
                ->setShowDropDown(true)
                ->setShowErrorMessage(true)
                ->setErrorTitle('Isian tidak dikenali')
                ->setError('Pilih salah satu dari daftar.')
                ->setFormula1('"'.implode(',', $pilihan).'"');

            $huruf = Coordinate::stringFromColumnIndex($index + 1);

            // Sekali per rentang, bukan sel per sel — menyentuh seribu sel satu
            // per satu membuat berkasnya membengkak dan lambat dibuat.
            $sheet->setDataValidation(
                "{$huruf}".self::BARIS_DATA_PERTAMA.":{$huruf}".self::BARIS_BERVALIDASI,
                $validasi,
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $kolom
     */
    private static function lembarPetunjuk(
        Spreadsheet $lembar,
        ReportTemplate $template,
        array $kolom,
    ): void {
        $sheet = $lembar->createSheet();
        $sheet->setTitle('Petunjuk');

        $sheet->setCellValue([1, 1], "Cara mengisi laporan {$template->name}");
        $sheet->getStyle([1, 1])->getFont()->setBold(true)->setSize(14);

        $catatan = [
            'Isi mulai baris 2 pada lembar Data.',
            'Hapus dua baris contoh sebelum mengunggah berkasnya.',
            'Baris dengan tanggal yang sama dikumpulkan menjadi satu laporan.',
            'Tanggal yang sudah punya laporan akan ditolak, bukan ditimpa. '
                .'Buka laporan itu bila ingin mengubahnya.',
            'Kolom hitungan tidak ada di berkas ini — nilainya dihitung sistem.',
            'Laporan hasil import tersimpan sebagai draf; kirim sendiri setelah diperiksa.',
            'Setelah diunggah, isinya ditampilkan lebih dulu untuk diperiksa sebelum disimpan.',
        ];

        foreach ($catatan as $nomor => $baris) {
            $sheet->setCellValue([1, 3 + $nomor], '• '.$baris);
        }

        $barisTabel = 3 + count($catatan) + 2;

        $sheet->setCellValue([1, $barisTabel], 'Kolom');
        $sheet->setCellValue([2, $barisTabel], 'Penjelasan');
        $sheet->setCellValue([3, $barisTabel], 'Pilihan yang diterima');
        $sheet->getStyle([1, $barisTabel, 3, $barisTabel])->getFont()->setBold(true);

        foreach ($kolom as $nomor => $satu) {
            $sheet->setCellValue([1, $barisTabel + 1 + $nomor], $satu['judul']);
            $sheet->setCellValue([2, $barisTabel + 1 + $nomor], $satu['petunjuk']);

            /** @var list<string> $pilihan */
            $pilihan = $satu['pilihan'];

            SelAman::tulis(
                $sheet,
                [3, $barisTabel + 1 + $nomor],
                $pilihan === [] ? '—' : implode('; ', array_slice($pilihan, 0, 30)),
            );
        }

        $sheet->getColumnDimensionByColumn(1)->setWidth(28);
        $sheet->getColumnDimensionByColumn(2)->setWidth(70);
        $sheet->getColumnDimensionByColumn(3)->setWidth(50);
        $sheet->getStyle([2, $barisTabel + 1, 3, $barisTabel + count($kolom)])
            ->getAlignment()
            ->setWrapText(true);
    }
}
