<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Pembuat kode penanda dari nama.
 *
 * Kode adalah penanda teknis, bukan isian pengguna: administrator tidak
 * seharusnya memikirkan bentuknya, dan kode yang diketik bebas mudah kembar
 * atau salah bentuk. Karena itu kode selalu diturunkan dari nama
 * (`docs/standar-ui-ux.md` §1.5).
 *
 * Kode **tidak pernah berubah** setelah dibuat. Nama boleh diperbaiki kapan
 * saja, tetapi kodenya sudah menjadi rujukan seeder, template, dan data lama.
 */
final class KodeOtomatis
{
    /**
     * Membuat kode unik dari sebuah nama.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query  Sumber pemeriksaan keunikan
     * @param  string  $kolom  Nama kolom kode pada tabel tersebut
     * @param  bool  $hurufKecil  Untuk penanda yang muncul di alamat URL
     */
    public static function dariNama(
        string $nama,
        Builder $query,
        string $kolom = 'code',
        int $panjangMaksimal = 32,
        bool $hurufKecil = false,
    ): string {
        $dasar = self::normalkan($nama, $panjangMaksimal, $hurufKecil);

        if (! self::terpakai($query, $kolom, $dasar)) {
            return $dasar;
        }

        // Kode kembar diberi akhiran urut: PRODUKSI, PRODUKSI_2, PRODUKSI_3.
        for ($urutan = 2; $urutan <= 999; $urutan++) {
            $akhiran = '_'.$urutan;
            $kandidat = mb_substr($dasar, 0, $panjangMaksimal - mb_strlen($akhiran)).$akhiran;

            if (! self::terpakai($query, $kolom, $kandidat)) {
                return $kandidat;
            }
        }

        // Praktis tidak tercapai; jaring pengaman agar tidak mengembalikan
        // kode kembar secara diam-diam.
        return mb_substr($dasar, 0, $panjangMaksimal - 7).'_'.Str::upper(Str::random(6));
    }

    /**
     * Mengubah nama menjadi bentuk kode: huruf, angka, dan garis bawah.
     *
     * Huruf kapital untuk kode yang dibaca manusia di layar (departemen,
     * template); huruf kecil untuk penanda yang muncul di alamat URL, mis.
     * slug jenis daftar master. Keduanya dinormalkan dengan aturan yang sama,
     * sehingga pemeriksaan keunikan tetap membandingkan bentuk yang setara.
     */
    public static function normalkan(
        string $nama,
        int $panjangMaksimal = 32,
        bool $hurufKecil = false,
    ): string {
        $kode = Str::of($nama)
            ->ascii()          // "Ekspor & Impor" -> "Ekspor & Impor"
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', '_')
            ->trim('_')
            ->limit($panjangMaksimal, '')
            ->trim('_')
            ->value();

        // Nama yang seluruhnya berupa tanda baca tetap harus menghasilkan kode.
        $kode = $kode === '' ? 'KODE_'.Str::upper(Str::random(6)) : $kode;

        return $hurufKecil ? Str::lower($kode) : $kode;
    }

    /**
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     */
    private static function terpakai(Builder $query, string $kolom, string $kode): bool
    {
        return (clone $query)->where($kolom, $kode)->exists();
    }
}
