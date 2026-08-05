<?php

namespace App\Support;

use App\Models\DailyReport;
use App\Models\MasterData;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as TanggalExcel;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Throwable;

/**
 * Membaca berkas import laporan harian dan memeriksanya baris per baris.
 *
 * **Membaca saja — tidak pernah menulis.** Pratinjau dan penyimpanan memakai
 * hasil dari pemeriksaan yang sama, sehingga yang dilihat pengguna benar-benar
 * yang akan tersimpan.
 *
 * Aturan pengisian tiap kolom tidak ditulis ulang di sini: yang dipakai adalah
 * `ValidasiIsianTemplate`, yang sama dengan pengisian lewat layar. Aturan yang
 * ditulis dua kali pasti berbeda di salah satunya, dan yang berbeda itu berarti
 * berkas import dapat memasukkan nilai yang ditolak layar.
 */
final class ImportLaporan
{
    /** Batas baris per berkas. */
    public const BATAS_BARIS = 2000;

    public const TINDAKAN_DITERIMA = 'diterima';

    public const TINDAKAN_DITOLAK = 'ditolak';

    /**
     * Membaca berkas, menilai tiap baris, lalu mengelompokkannya per tanggal.
     *
     * @return array{
     *     baris: list<array<string, mixed>>,
     *     tanggal: list<array{tanggal: string, jumlah_baris: int, sudah_ada: bool}>,
     *     ringkasan: array{diterima: int, ditolak: int, total: int, laporan: int},
     *     terpotong: bool
     * }
     */
    public static function periksa(
        UploadedFile $berkas,
        ReportTemplate $template,
        User $pengguna,
    ): array {
        $sheet = self::lembarData($berkas);
        $kolom = TemplateImportLaporan::kolom($template);

        $masterPerKolom = self::muatMaster($template);

        /*
         * Tanggal yang sudah punya laporan dimuat sekali di muka. Berkas tiga
         * puluh baris berarti tiga puluh query bila ditanyakan per baris — dan
         * dijalankan dua kali, sebab pratinjau dan penyimpanan memanggil
         * pemeriksaan yang sama.
         */
        $tanggalTerpakai = DailyReport::where('user_id', $pengguna->getKey())
            ->pluck('report_date')
            ->map(fn ($tanggal) => Carbon::parse($tanggal)->toDateString())
            ->flip();

        $hasil = [];
        $terpotong = false;
        $barisTerakhir = $sheet->getHighestDataRow();

        for ($nomor = TemplateImportLaporan::BARIS_DATA_PERTAMA; $nomor <= $barisTerakhir; $nomor++) {
            if (count($hasil) >= self::BATAS_BARIS) {
                $terpotong = true;
                break;
            }

            $mentah = [];
            foreach ($kolom as $index => $satu) {
                $mentah[$satu['kunci']] = self::nilaiSel($sheet, $index + 1, $nomor);
            }

            // Baris kosong seluruhnya dilewati — berkas Excel kerap menyimpan
            // baris kosong di bawah data terakhirnya.
            if (implode('', array_map(fn ($n) => is_array($n) ? '' : (string) $n, $mentah)) === '') {
                continue;
            }

            $hasil[] = self::nilaiBaris($nomor, $mentah, $template, $kolom, $masterPerKolom, $tanggalTerpakai);
        }

        return [
            'baris' => $hasil,
            'tanggal' => self::rekapTanggal($hasil, $tanggalTerpakai),
            'ringkasan' => self::ringkasan($hasil),
            'terpotong' => $terpotong,
        ];
    }

    /**
     * Menilai satu baris: bentuk nilainya, lalu aturan templatenya.
     *
     * @param  array<string, mixed>  $mentah
     * @param  list<array<string, mixed>>  $kolom
     * @param  array<string, Collection<int, MasterData>>  $masterPerKolom
     * @param  Collection<string, int>  $tanggalTerpakai
     * @return array<string, mixed>
     */
    private static function nilaiBaris(
        int $nomor,
        array $mentah,
        ReportTemplate $template,
        array $kolom,
        array $masterPerKolom,
        Collection $tanggalTerpakai,
    ): array {
        $baris = [
            'baris' => $nomor,
            'tanggal' => null,
            'nilai' => [],
            'tampilan' => [],
            'tindakan' => self::TINDAKAN_DITERIMA,
            'alasan' => null,
        ];

        $tanggal = self::bacaTanggal($mentah[TemplateImportLaporan::KUNCI_TANGGAL] ?? null);

        if ($tanggal === null) {
            return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => 'Tanggal belum diisi atau bentuknya tidak dikenali.'];
        }

        $baris['tanggal'] = $tanggal;

        if ($tanggalTerpakai->has($tanggal)) {
            return [
                ...$baris,
                'tindakan' => self::TINDAKAN_DITOLAK,
                /*
                 * Ditolak, bukan ditimpa. Laporan yang sudah ada mungkin sudah
                 * dikirim dan ditinjau; menimpanya lewat berkas berarti
                 * menghapus catatan yang sudah menjadi arsip tanpa jejak.
                 */
                'alasan' => 'Tanggal ini sudah punya laporan. Buka laporan itu bila ingin mengubahnya.',
            ];
        }

        $nilai = [];
        $tampilan = [];

        foreach ($kolom as $satu) {
            if ($satu['kunci'] === TemplateImportLaporan::KUNCI_TANGGAL) {
                continue;
            }

            /** @var TemplateField $field */
            $field = $satu['field'];

            $hasil = self::ubahNilai(
                $mentah[$satu['kunci']] ?? null,
                $field,
                $masterPerKolom[$field->key] ?? null,
            );

            if ($hasil['galat'] !== null) {
                return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => $hasil['galat']];
            }

            $nilai[$field->key] = $hasil['nilai'];
            $tampilan[$field->label] = $hasil['tampilan'];
        }

        $baris['nilai'] = $nilai;
        $baris['tampilan'] = $tampilan;

        /*
         * Aturan templatenya dijalankan lewat jalur yang sama dengan pengisian
         * lewat layar, sehingga berkas import tidak dapat memasukkan nilai yang
         * ditolak layar.
         */
        try {
            ValidasiIsianTemplate::periksa($template, [$nilai], 'baris');
        } catch (ValidationException $galat) {
            return [
                ...$baris,
                'tindakan' => self::TINDAKAN_DITOLAK,
                'alasan' => collect($galat->errors())->flatten()->first() ?? 'Isian tidak sah.',
            ];
        }

        return $baris;
    }

    /**
     * Mengubah satu sel menjadi bentuk yang disimpan laporan.
     *
     * @param  Collection<int, MasterData>|null  $master
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function ubahNilai(mixed $mentah, TemplateField $field, ?Collection $master): array
    {
        $teks = is_string($mentah) ? trim($mentah) : $mentah;
        $kosong = $teks === null || $teks === '';

        if ($kosong) {
            // Kolom Ya/Tidak yang dikosongkan berarti Tidak, bukan tanpa nilai —
            // itu yang jauh lebih sering dimaksud pengisinya.
            $nilai = $field->type === TemplateField::TIPE_BOOLEAN ? false : null;

            return ['nilai' => $nilai, 'tampilan' => '', 'galat' => null];
        }

        return match ($field->type) {
            TemplateField::TIPE_INTEGER => self::angka($teks, $field, true),
            TemplateField::TIPE_DECIMAL => self::angka($teks, $field, false),
            TemplateField::TIPE_BOOLEAN => self::yaTidak($teks, $field),
            TemplateField::TIPE_DATE => self::tanggalKolom($teks, $field),
            TemplateField::TIPE_MONTH => self::bulan($teks, $field),
            TemplateField::TIPE_TIME => self::jam($teks, $field),
            TemplateField::TIPE_SELECT => self::pilihanTunggal($teks, $field),
            TemplateField::TIPE_MULTISELECT => self::pilihanMajemuk($teks, $field),
            TemplateField::TIPE_MASTER => self::dariMaster($teks, $field, $master),
            default => ['nilai' => (string) $teks, 'tampilan' => (string) $teks, 'galat' => null],
        };
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function angka(mixed $teks, TemplateField $field, bool $bulat): array
    {
        if (is_numeric($teks)) {
            $angka = $teks + 0;
        } else {
            /*
             * Koma diterima sebagai pemisah desimal. Pengisinya memakai Excel
             * berlokal Indonesia, tempat "12,5" adalah bentuk yang wajar —
             * menolaknya berarti menolak isian yang benar menurut layarnya.
             */
            $bersih = str_replace([' ', '.'], '', (string) $teks);
            $bersih = str_replace(',', '.', $bersih);

            if (! is_numeric($bersih)) {
                return ['nilai' => null, 'tampilan' => '', 'galat' => "Kolom {$field->label} harus berupa angka."];
            }

            $angka = $bersih + 0;
        }

        $nilai = $bulat ? (int) round((float) $angka) : (float) $angka;

        return ['nilai' => $nilai, 'tampilan' => (string) $nilai, 'galat' => null];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function yaTidak(mixed $teks, TemplateField $field): array
    {
        $bersih = mb_strtolower(trim((string) $teks));

        if (in_array($bersih, ['ya', 'y', 'true', '1', 'benar'], true)) {
            return ['nilai' => true, 'tampilan' => 'Ya', 'galat' => null];
        }

        if (in_array($bersih, ['tidak', 'n', 'false', '0', 'salah'], true)) {
            return ['nilai' => false, 'tampilan' => 'Tidak', 'galat' => null];
        }

        return ['nilai' => null, 'tampilan' => '', 'galat' => "Kolom {$field->label} harus diisi Ya atau Tidak."];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function tanggalKolom(mixed $teks, TemplateField $field): array
    {
        $tanggal = self::bacaTanggal($teks);

        if ($tanggal === null) {
            return ['nilai' => null, 'tampilan' => '', 'galat' => "Kolom {$field->label} bukan tanggal yang dikenali."];
        }

        return ['nilai' => $tanggal, 'tampilan' => $tanggal, 'galat' => null];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function bulan(mixed $teks, TemplateField $field): array
    {
        if (is_string($teks) && preg_match('/^\d{4}-\d{2}$/', trim($teks)) === 1) {
            return ['nilai' => trim($teks), 'tampilan' => trim($teks), 'galat' => null];
        }

        $tanggal = self::bacaTanggal($teks);

        if ($tanggal === null) {
            return ['nilai' => null, 'tampilan' => '', 'galat' => "Kolom {$field->label} bukan bulan yang dikenali."];
        }

        $bulan = mb_substr($tanggal, 0, 7);

        return ['nilai' => $bulan, 'tampilan' => $bulan, 'galat' => null];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function jam(mixed $teks, TemplateField $field): array
    {
        /*
         * Excel menyimpan jam sebagai pecahan hari: 08.15 menjadi 0,34375.
         * Tanpa penanganan ini, kolom jam yang diisi lewat pemilih waktu Excel
         * masuk sebagai angka dan ditolak sebagai bukan jam.
         */
        if (is_numeric($teks) && (float) $teks >= 0 && (float) $teks < 1) {
            $detik = (int) round((float) $teks * 86400);
            $jam = sprintf('%02d:%02d', intdiv($detik, 3600), intdiv($detik % 3600, 60));

            return ['nilai' => $jam, 'tampilan' => $jam, 'galat' => null];
        }

        $bersih = trim((string) $teks);

        if (preg_match('/^(\d{1,2})[.:](\d{2})/', $bersih, $cocok) === 1) {
            $jam = sprintf('%02d:%02d', (int) $cocok[1], (int) $cocok[2]);

            return ['nilai' => $jam, 'tampilan' => $jam, 'galat' => null];
        }

        return ['nilai' => null, 'tampilan' => '', 'galat' => "Kolom {$field->label} bukan jam yang dikenali."];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function pilihanTunggal(mixed $teks, TemplateField $field): array
    {
        $bersih = trim((string) $teks);

        foreach ($field->options ?? [] as $opsi) {
            // Dicocokkan dengan label maupun nilainya: yang tampil di berkas
            // adalah labelnya, tetapi pengisi bisa saja menyalin nilainya.
            if (
                mb_strtolower((string) ($opsi['label'] ?? '')) === mb_strtolower($bersih)
                || mb_strtolower((string) ($opsi['nilai'] ?? '')) === mb_strtolower($bersih)
            ) {
                return [
                    'nilai' => $opsi['nilai'] ?? $opsi['label'],
                    'tampilan' => (string) ($opsi['label'] ?? $opsi['nilai']),
                    'galat' => null,
                ];
            }
        }

        return ['nilai' => null, 'tampilan' => '', 'galat' => "\"{$bersih}\" bukan pilihan yang sah untuk kolom {$field->label}."];
    }

    /**
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function pilihanMajemuk(mixed $teks, TemplateField $field): array
    {
        $bagian = preg_split('/[;,]/', (string) $teks) ?: [];
        $nilai = [];
        $label = [];

        foreach ($bagian as $satu) {
            $bersih = trim($satu);
            if ($bersih === '') {
                continue;
            }

            $hasil = self::pilihanTunggal($bersih, $field);

            if ($hasil['galat'] !== null) {
                return $hasil;
            }

            $nilai[] = $hasil['nilai'];
            $label[] = $hasil['tampilan'];
        }

        return ['nilai' => $nilai, 'tampilan' => implode('; ', $label), 'galat' => null];
    }

    /**
     * @param  Collection<int, MasterData>|null  $master
     * @return array{nilai: mixed, tampilan: string, galat: string|null}
     */
    private static function dariMaster(mixed $teks, TemplateField $field, ?Collection $master): array
    {
        $bersih = trim((string) $teks);

        $cocok = $master?->first(
            fn (MasterData $satu) => mb_strtolower($satu->name) === mb_strtolower($bersih)
                || mb_strtolower($satu->code) === mb_strtolower($bersih),
        );

        if ($cocok === null) {
            return ['nilai' => null, 'tampilan' => '', 'galat' => "\"{$bersih}\" tidak ada pada daftar {$field->label}."];
        }

        // Yang disimpan adalah salinan `{kode, nama}`, bukan kunci asing —
        // laporan adalah arsip dan tidak boleh berubah bila masternya berubah.
        return [
            'nilai' => $cocok->untukLaporan(),
            'tampilan' => $cocok->name,
            'galat' => null,
        ];
    }

    /**
     * Tanggal dari sel, apa pun bentuk aslinya.
     *
     * Excel menyimpan tanggal sebagai angka hari sejak 1900, dan pembacaan
     * hanya-data membuang informasi gaya yang biasanya menandainya sebagai
     * tanggal. Angka dalam rentang yang masuk akal karena itu diperlakukan
     * sebagai tanggal Excel; sisanya diurai sebagai teks.
     */
    private static function bacaTanggal(mixed $nilai): ?string
    {
        if ($nilai === null || $nilai === '') {
            return null;
        }

        if (is_numeric($nilai) && (float) $nilai >= 1 && (float) $nilai <= 100000) {
            try {
                return Carbon::instance(TanggalExcel::excelToDateTimeObject((float) $nilai))
                    ->toDateString();
            } catch (Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse(trim((string) $nilai))->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Daftar master tiap kolom bertipe master, dimuat sekali.
     *
     * @return array<string, Collection<int, MasterData>>
     */
    private static function muatMaster(ReportTemplate $template): array
    {
        $peta = [];

        foreach ($template->fields as $field) {
            if (! $field->bertipeMaster() || $field->master_type_id === null) {
                continue;
            }

            $peta[$field->key] = MasterData::where('master_type_id', $field->master_type_id)
                ->aktif()
                ->get(['id', 'code', 'name']);
        }

        return $peta;
    }

    /**
     * @param  list<array<string, mixed>>  $baris
     * @param  Collection<string, int>  $tanggalTerpakai
     * @return list<array{tanggal: string, jumlah_baris: int, sudah_ada: bool}>
     */
    private static function rekapTanggal(array $baris, Collection $tanggalTerpakai): array
    {
        $rekap = [];

        foreach ($baris as $satu) {
            if ($satu['tanggal'] === null || $satu['tindakan'] !== self::TINDAKAN_DITERIMA) {
                continue;
            }

            $rekap[$satu['tanggal']] = ($rekap[$satu['tanggal']] ?? 0) + 1;
        }

        ksort($rekap);

        return array_values(array_map(
            fn (int $jumlah, string $tanggal) => [
                'tanggal' => $tanggal,
                'jumlah_baris' => $jumlah,
                'sudah_ada' => $tanggalTerpakai->has($tanggal),
            ],
            $rekap,
            array_keys($rekap),
        ));
    }

    /**
     * @param  list<array<string, mixed>>  $baris
     * @return array{diterima: int, ditolak: int, total: int, laporan: int}
     */
    private static function ringkasan(array $baris): array
    {
        $diterima = array_filter($baris, fn ($satu) => $satu['tindakan'] === self::TINDAKAN_DITERIMA);

        return [
            'diterima' => count($diterima),
            'ditolak' => count($baris) - count($diterima),
            'total' => count($baris),
            'laporan' => count(array_unique(array_column($diterima, 'tanggal'))),
        ];
    }

    private static function nilaiSel(Worksheet $sheet, int $kolom, int $baris): mixed
    {
        $nilai = $sheet->getCell([$kolom, $baris])->getValue();

        return is_array($nilai) ? null : $nilai;
    }

    private static function lembarData(UploadedFile $berkas): Worksheet
    {
        $pembaca = IOFactory::createReaderForFile($berkas->getRealPath());
        $pembaca->setReadDataOnly(true);

        $lembar = $pembaca->load($berkas->getRealPath());

        return $lembar->getSheetByName('Data') ?? $lembar->getSheet(0);
    }
}
