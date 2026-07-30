<?php

namespace App\Support;

use RuntimeException;

/**
 * Penghitung rumus kolom template.
 *
 * Rumus ditulis administrator, mis. `qty_masuk - qty_keluar`. Nilainya
 * **selalu dihitung ulang di server**; angka hasil hitungan yang dikirim
 * klien tidak pernah dipercaya. Kolom hitungan terkunci di antarmuka, tetapi
 * antarmuka bukan tempat menegakkan aturan.
 *
 * Bahasanya sengaja sangat sempit: nama kolom, angka, kurung, dan operator
 * `+ - * /`. Tidak ada pemanggilan fungsi, tidak ada `eval`. Rumus datang dari
 * administrator yang tepercaya, tetapi mengevaluasi teks sebagai kode tetap
 * jalan masuk yang tidak perlu dibuka.
 */
final class Rumus
{
    /**
     * Menghitung sebuah rumus terhadap nilai baris.
     *
     * @param  array<string, mixed>  $nilai  Isi baris, berkunci nama kolom
     * @return float|null NULL bila rumusnya tidak dapat dihitung
     */
    public static function hitung(string $rumus, array $nilai): ?float
    {
        try {
            $token = self::pisahkan($rumus);

            if ($token === []) {
                return null;
            }

            $hasil = self::evaluasi(self::keNotasiPostfix($token), $nilai);

            return is_finite($hasil) ? round($hasil, 3) : null;
        } catch (RuntimeException) {
            // Rumus rusak tidak boleh menggagalkan penyimpanan seluruh laporan.
            // Kolomnya dibiarkan kosong; validasi template sudah menolak rumus
            // yang menyebut kolom tak dikenal saat template dibuat.
            return null;
        }
    }

    /**
     * @return list<string>
     */
    private static function pisahkan(string $rumus): array
    {
        preg_match_all('/[a-z_][a-z0-9_]*|\d+(?:\.\d+)?|[()+\-*\/]/i', $rumus, $cocok);

        return $cocok[0];
    }

    /**
     * Shunting-yard: infix menjadi postfix.
     *
     * @param  list<string>  $token
     * @return list<string>
     */
    private static function keNotasiPostfix(array $token): array
    {
        $prioritas = ['+' => 1, '-' => 1, '*' => 2, '/' => 2];

        $keluaran = [];
        $operator = [];

        foreach ($token as $item) {
            if (isset($prioritas[$item])) {
                while (
                    $operator !== []
                    && end($operator) !== '('
                    && $prioritas[end($operator)] >= $prioritas[$item]
                ) {
                    $keluaran[] = array_pop($operator);
                }
                $operator[] = $item;

                continue;
            }

            if ($item === '(') {
                $operator[] = $item;

                continue;
            }

            if ($item === ')') {
                while ($operator !== [] && end($operator) !== '(') {
                    $keluaran[] = array_pop($operator);
                }

                if ($operator === []) {
                    throw new RuntimeException('Kurung tidak berpasangan.');
                }

                array_pop($operator);

                continue;
            }

            $keluaran[] = $item;
        }

        while ($operator !== []) {
            $sisa = array_pop($operator);

            if ($sisa === '(') {
                throw new RuntimeException('Kurung tidak berpasangan.');
            }

            $keluaran[] = $sisa;
        }

        return $keluaran;
    }

    /**
     * @param  list<string>  $postfix
     * @param  array<string, mixed>  $nilai
     */
    private static function evaluasi(array $postfix, array $nilai): float
    {
        $tumpukan = [];

        foreach ($postfix as $item) {
            if (in_array($item, ['+', '-', '*', '/'], true)) {
                $kanan = array_pop($tumpukan);
                $kiri = array_pop($tumpukan);

                if ($kiri === null || $kanan === null) {
                    throw new RuntimeException('Rumus tidak lengkap.');
                }

                $tumpukan[] = match ($item) {
                    '+' => $kiri + $kanan,
                    '-' => $kiri - $kanan,
                    '*' => $kiri * $kanan,
                    // Pembagian nol menghasilkan rumus yang tidak dapat
                    // dihitung, bukan galat yang menggagalkan penyimpanan.
                    '/' => $kanan == 0.0 ? throw new RuntimeException('Pembagian nol.') : $kiri / $kanan,
                };

                continue;
            }

            if (is_numeric($item)) {
                $tumpukan[] = (float) $item;

                continue;
            }

            // Nama kolom. Kolom kosong dihitung sebagai nol supaya baris yang
            // baru terisi sebagian tetap menghasilkan angka.
            $tumpukan[] = self::keAngka($nilai[$item] ?? null);
        }

        if (count($tumpukan) !== 1) {
            throw new RuntimeException('Rumus tidak sah.');
        }

        return (float) $tumpukan[0];
    }

    private static function keAngka(mixed $nilai): float
    {
        if (is_numeric($nilai)) {
            return (float) $nilai;
        }

        return 0.0;
    }
}
