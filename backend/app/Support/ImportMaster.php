<?php

namespace App\Support;

use App\Models\MasterData;
use App\Models\MasterType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Membaca berkas import daftar master dan memeriksanya baris per baris.
 *
 * **Membaca saja — tidak pernah menulis.** Pratinjau dan penyimpanan memakai
 * hasil dari kelas yang sama, sehingga yang dilihat pengguna pada pratinjau
 * benar-benar yang akan tersimpan. Dua jalur terpisah yang menghitung sendiri
 * pasti berbeda di suatu tempat, dan langkah pratinjau kehilangan gunanya.
 */
final class ImportMaster
{
    /** Batas baris per berkas. Melewati ini, berkasnya ditolak seluruhnya. */
    public const BATAS_BARIS = 2000;

    public const TINDAKAN_BARU = 'baru';

    public const TINDAKAN_PERBARUI = 'perbarui';

    public const TINDAKAN_DITOLAK = 'ditolak';

    /**
     * Membaca berkas dan menilai tiap barisnya.
     *
     * @return array{
     *     baris: list<array<string, mixed>>,
     *     ringkasan: array{baru: int, perbarui: int, ditolak: int, total: int},
     *     terpotong: bool
     * }
     */
    public static function periksa(UploadedFile $berkas, MasterType $jenis): array
    {
        $sheet = self::lembarData($berkas);
        $kolom = TemplateImportMaster::kolom($jenis);

        $indeks = [];
        foreach ($kolom as $nomor => $satu) {
            $indeks[$satu['kunci']] = $nomor + 1;
        }

        /*
         * Nama yang sudah ada dimuat sekali di muka, bukan ditanyakan per
         * baris. Berkas dua ribu baris berarti dua ribu query — dan itu
         * dijalankan dua kali, sebab pratinjau dan penyimpanan memanggil
         * pemeriksaan yang sama.
         */
        $sudahAda = MasterData::where('master_type_id', $jenis->id)
            ->pluck('id', 'name')
            ->mapWithKeys(fn (int $id, string $nama) => [mb_strtolower(trim($nama)) => $id]);

        $indukTersedia = $jenis->berinduk()
            ? MasterData::where('master_type_id', $jenis->parent_type_id)
                ->get(['id', 'code', 'name'])
            : collect();

        $hasil = [];
        $namaTerpakai = [];
        $terpotong = false;

        $barisTerakhir = $sheet->getHighestDataRow();

        for ($nomor = TemplateImportMaster::BARIS_DATA_PERTAMA; $nomor <= $barisTerakhir; $nomor++) {
            if (count($hasil) >= self::BATAS_BARIS) {
                $terpotong = true;
                break;
            }

            $isi = [];
            foreach ($indeks as $kunci => $kolomKe) {
                $isi[$kunci] = self::nilaiSel($sheet, $kolomKe, $nomor);
            }

            // Baris kosong seluruhnya dilewati tanpa dianggap salah — berkas
            // Excel kerap menyimpan baris kosong di bawah data terakhirnya.
            if (implode('', $isi) === '') {
                continue;
            }

            $hasil[] = self::nilaiBaris($nomor, $isi, $jenis, $sudahAda, $indukTersedia, $namaTerpakai);
        }

        return [
            'baris' => $hasil,
            'ringkasan' => [
                'baru' => self::hitung($hasil, self::TINDAKAN_BARU),
                'perbarui' => self::hitung($hasil, self::TINDAKAN_PERBARUI),
                'ditolak' => self::hitung($hasil, self::TINDAKAN_DITOLAK),
                'total' => count($hasil),
            ],
            'terpotong' => $terpotong,
        ];
    }

    /**
     * Menilai satu baris.
     *
     * @param  array<string, string>  $isi
     * @param  Collection<string, int>  $sudahAda
     * @param  Collection<int, MasterData>  $indukTersedia
     * @param  array<string, int>  $namaTerpakai  Nama yang sudah muncul di berkas ini
     * @return array<string, mixed>
     */
    private static function nilaiBaris(
        int $nomor,
        array $isi,
        MasterType $jenis,
        $sudahAda,
        $indukTersedia,
        array &$namaTerpakai,
    ): array {
        $nama = trim($isi['nama'] ?? '');
        $kunciNama = mb_strtolower($nama);

        $baris = [
            'baris' => $nomor,
            'nama' => $nama,
            'induk' => trim($isi['induk'] ?? '') ?: null,
            'keterangan' => trim($isi['keterangan'] ?? '') ?: null,
            'aktif' => self::bacaAktif($isi['aktif'] ?? ''),
            'induk_id' => null,
            'tindakan' => self::TINDAKAN_BARU,
            'alasan' => null,
        ];

        if ($nama === '') {
            return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => 'Nama belum diisi.'];
        }

        if (mb_strlen($nama) > 150) {
            return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => 'Nama melebihi 150 karakter.'];
        }

        if ($baris['keterangan'] !== null && mb_strlen($baris['keterangan']) > 255) {
            return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => 'Keterangan melebihi 255 karakter.'];
        }

        /*
         * Nama kembar di dalam satu berkas ditolak, bukan diproses dua kali.
         * Tanpa ini baris kedua akan menimpa baris pertama diam-diam, dan
         * pratinjau menampilkan keduanya seolah keduanya tersimpan.
         */
        if (isset($namaTerpakai[$kunciNama])) {
            return [
                ...$baris,
                'tindakan' => self::TINDAKAN_DITOLAK,
                'alasan' => "Nama ini sudah ada di baris {$namaTerpakai[$kunciNama]} pada berkas yang sama.",
            ];
        }

        if ($jenis->berinduk()) {
            if ($baris['induk'] === null) {
                $namaInduk = $jenis->induk?->name ?? 'Induk';

                return [...$baris, 'tindakan' => self::TINDAKAN_DITOLAK, 'alasan' => "{$namaInduk} belum diisi."];
            }

            $cocok = $indukTersedia->first(
                fn (MasterData $satu) => mb_strtolower($satu->name) === mb_strtolower($baris['induk'])
                    || mb_strtolower($satu->code) === mb_strtolower($baris['induk']),
            );

            if ($cocok === null) {
                return [
                    ...$baris,
                    'tindakan' => self::TINDAKAN_DITOLAK,
                    'alasan' => "\"{$baris['induk']}\" tidak ditemukan pada daftar induknya.",
                ];
            }

            $baris['induk_id'] = $cocok->id;
        } elseif ($baris['induk'] !== null) {
            $baris['induk'] = null;
        }

        $namaTerpakai[$kunciNama] = $nomor;

        if ($sudahAda->has($kunciNama)) {
            return [
                ...$baris,
                'tindakan' => self::TINDAKAN_PERBARUI,
                'id' => $sudahAda->get($kunciNama),
            ];
        }

        return $baris;
    }

    /**
     * Nilai sel sebagai teks apa adanya.
     *
     * Memakai `getValue()`, **bukan** `getCalculatedValue()`. Berkas ini
     * diunggah pengguna, dan menghitung rumus di dalamnya berarti menjalankan
     * ekspresi kiriman orang lain di server. Sel berisi `=1+1` masuk sebagai
     * teks `=1+1`, dan tetap menjadi teks saat kelak diexport kembali karena
     * `SelAman` yang menuliskannya.
     */
    private static function nilaiSel(Worksheet $sheet, int $kolom, int $baris): string
    {
        $nilai = $sheet->getCell([$kolom, $baris])->getValue();

        if ($nilai === null || is_array($nilai)) {
            return '';
        }

        if (is_bool($nilai)) {
            return $nilai ? 'Ya' : 'Tidak';
        }

        return trim((string) $nilai);
    }

    /** Kosong berarti aktif — itu keadaan yang jauh lebih sering dimaksud. */
    private static function bacaAktif(string $nilai): bool
    {
        $bersih = mb_strtolower(trim($nilai));

        return ! in_array($bersih, ['tidak', 'no', 'nonaktif', 'n', '0', 'false'], true);
    }

    /**
     * @param  list<array<string, mixed>>  $baris
     */
    private static function hitung(array $baris, string $tindakan): int
    {
        return count(array_filter($baris, fn (array $satu) => $satu['tindakan'] === $tindakan));
    }

    private static function lembarData(UploadedFile $berkas): Worksheet
    {
        $pembaca = IOFactory::createReaderForFile($berkas->getRealPath());

        /*
         * Hanya nilai yang dibaca; gaya, gambar, dan objek lain diabaikan.
         * Selain jauh lebih hemat memori, ini juga memperkecil permukaan
         * serangan berkas kiriman.
         */
        $pembaca->setReadDataOnly(true);

        $lembar = $pembaca->load($berkas->getRealPath());

        // Lembar "Data" bila ada; kalau tidak, lembar pertama — pengguna dapat
        // saja menyusun berkasnya sendiri tanpa memakai template.
        return $lembar->getSheetByName('Data') ?? $lembar->getSheet(0);
    }
}
