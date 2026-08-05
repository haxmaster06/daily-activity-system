<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Penyimpanan foto profil.
 *
 * ## Gambarnya digambar ulang, tidak pernah disimpan apa adanya
 *
 * Dan itu bukan sekadar penghematan tempat. Berkas gambar yang diunggah dapat:
 *
 * 1. **Memuat metadata EXIF** — termasuk titik koordinat tempat foto diambil.
 *    Foto profil karyawan yang membocorkan alamat rumahnya bukan hal yang boleh
 *    terjadi diam-diam.
 * 2. **Sah sebagai dua jenis berkas sekaligus.** Berkas yang lolos pemeriksaan
 *    sebagai JPEG dan sekaligus dapat dijalankan sebagai skrip adalah teknik
 *    yang sudah tua dan masih berhasil.
 * 3. **Berukuran 8000 × 8000 piksel.** Berkasnya kecil, tetapi memuatnya ke
 *    memori tidak.
 *
 * Menggambar ulang lewat GD menghapus ketiganya sekaligus: yang tersimpan adalah
 * piksel hasil `imagecopyresampled()`, bukan satu bita pun dari berkas aslinya.
 *
 * Tidak memakai pustaka tambahan. GD sudah ada pada seluruh instalasi PHP yang
 * dipakai project ini, dan menyeret Intervention Image demi satu fungsi
 * pengubah ukuran menambah pustaka yang harus ikut diperbarui selamanya.
 */
final class FotoProfil
{
    /** Sisi terpanjang hasil simpan, dalam piksel. */
    public const SISI = 512;

    /** Ukuran berkas terbesar yang diterima, dalam bita. */
    public const MAKS_BYTE = 5 * 1024 * 1024;

    /**
     * Piksel terbanyak yang boleh dimuat ke memori.
     *
     * Menahan "bom dekompresi": berkas PNG 200 KB dapat memuai menjadi lebih
     * dari satu gigabita begitu digambar. Diperiksa dari kepala berkasnya,
     * sebelum satu piksel pun dibaca.
     */
    private const MAKS_PIKSEL = 40_000_000;

    /** Cakram penyimpanan — di luar direktori publik. */
    public const CAKRAM = 'local';

    /** @var list<string> */
    public const EKSTENSI = ['jpg', 'jpeg', 'png', 'webp'];

    /** @var list<string> */
    public const TIPE_ISI = ['image/jpeg', 'image/png', 'image/webp'];

    public static function label(): string
    {
        return 'JPG, PNG, atau WebP';
    }

    /** Apakah ukuran gambarnya masuk akal untuk dimuat ke memori. */
    public static function ukuranWajar(string $jalurBerkas): bool
    {
        $ukuran = @getimagesize($jalurBerkas);

        if ($ukuran === false) {
            return false;
        }

        return $ukuran[0] * $ukuran[1] <= self::MAKS_PIKSEL;
    }

    /**
     * Menyimpan foto sebagai JPEG persegi, dan mengembalikan jalurnya.
     *
     * Nama berkasnya acak, tidak pernah memakai nama dari pengguna: nama dari
     * pengguna dapat memuat karakter yang berbahaya bagi jalur berkas, dapat
     * kembar, dan dapat ditebak.
     */
    public static function simpan(UploadedFile $berkas, int $penggunaId): string
    {
        $sumber = self::baca($berkas);
        $hasil = self::persegi($sumber);
        imagedestroy($sumber);

        ob_start();
        imagejpeg($hasil, null, 82);
        $isi = (string) ob_get_clean();
        imagedestroy($hasil);

        $jalur = "foto-profil/{$penggunaId}/".Str::uuid()->toString().'.jpg';

        Storage::disk(self::CAKRAM)->put($jalur, $isi);

        return $jalur;
    }

    public static function hapus(?string $jalur): void
    {
        if ($jalur === null || $jalur === '') {
            return;
        }

        Storage::disk(self::CAKRAM)->delete($jalur);
    }

    /**
     * @return \GdImage
     */
    private static function baca(UploadedFile $berkas)
    {
        $jalur = $berkas->getRealPath();

        $gambar = match ($berkas->getMimeType()) {
            'image/png' => imagecreatefrompng($jalur),
            'image/webp' => imagecreatefromwebp($jalur),
            default => imagecreatefromjpeg($jalur),
        };

        if ($gambar === false) {
            // Sudah lolos validasi tipe; sampai di sini berarti berkasnya rusak.
            throw new \RuntimeException('Berkas gambar tidak dapat dibaca.');
        }

        return $gambar;
    }

    /**
     * Memotong bagian tengah menjadi persegi, lalu mengecilkannya.
     *
     * Dipotong, bukan diregangkan: foto yang berubah proporsi membuat wajah
     * orangnya terlihat salah, dan itu justru satu-satunya isi gambar ini.
     *
     * @param  \GdImage  $sumber
     * @return \GdImage
     */
    private static function persegi($sumber)
    {
        $lebar = imagesx($sumber);
        $tinggi = imagesy($sumber);
        $sisi = min($lebar, $tinggi);

        $keluaran = min($sisi, self::SISI);
        $hasil = imagecreatetruecolor($keluaran, $keluaran);

        // Latar putih: PNG dan WebP dapat tembus pandang, dan JPEG tidak
        // mengenal itu — tanpa latar, bagian tembusnya menjadi hitam pekat.
        imagefill($hasil, 0, 0, imagecolorallocate($hasil, 255, 255, 255));

        imagecopyresampled(
            $hasil,
            $sumber,
            0,
            0,
            (int) (($lebar - $sisi) / 2),
            (int) (($tinggi - $sisi) / 2),
            $keluaran,
            $keluaran,
            $sisi,
            $sisi,
        );

        return $hasil;
    }
}
