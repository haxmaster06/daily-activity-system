<?php

namespace App\Support;

/**
 * Jenis berkas yang diterima sebagai lampiran laporan.
 *
 * Daftarnya sengaja tertutup. Menerima apa saja lalu menyaring yang berbahaya
 * berarti bertaruh bahwa daftar bahaya itu lengkap — dan daftar semacam itu
 * tidak pernah lengkap.
 *
 * Berkas Office boleh, tetapi memuat makro. Karena itu lampiran tidak pernah
 * disajikan langsung dari penyimpanan: unduhannya selalu melewati controller
 * yang memeriksa izin, dan selalu dikirim sebagai `attachment` supaya peramban
 * tidak pernah mencoba membukanya sendiri.
 */
final class JenisLampiran
{
    /** 10 MB — cukup untuk foto ponsel dan dokumen pindaian. */
    public const MAKS_BYTE = 10 * 1024 * 1024;

    /** Maksimal lampiran per laporan. */
    public const MAKS_PER_LAPORAN = 10;

    /**
     * Ekstensi yang diterima, beserta tipe isi yang sah untuknya.
     *
     * Keduanya diperiksa: ekstensi saja dapat diganti siapa pun, dan tipe isi
     * saja tidak menghalangi berkas skrip yang menyamar sebagai teks biasa.
     *
     * @var array<string, list<string>>
     */
    public const DITERIMA = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'webp' => ['image/webp'],
        'pdf' => ['application/pdf'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ];

    /**
     * @return list<string>
     */
    public static function ekstensi(): array
    {
        return array_keys(self::DITERIMA);
    }

    /**
     * @return list<string>
     */
    public static function tipeIsi(): array
    {
        return array_values(array_unique(array_merge(...array_values(self::DITERIMA))));
    }

    /** Apakah pasangan ekstensi dan tipe isi memang cocok. */
    public static function cocok(string $ekstensi, string $tipeIsi): bool
    {
        $ekstensi = mb_strtolower($ekstensi);

        return in_array($tipeIsi, self::DITERIMA[$ekstensi] ?? [], true);
    }

    /** Daftar siap tampil, mis. "JPG, PNG, WEBP, PDF, XLSX, DOCX". */
    public static function label(): string
    {
        return mb_strtoupper(implode(', ', array_unique(
            array_map(fn (string $e) => $e === 'jpeg' ? 'jpg' : $e, self::ekstensi()),
        )));
    }
}
