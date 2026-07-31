<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\DailyReport;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Izin lampiran laporan (deny by default).
 *
 * Lampiran mengikuti laporannya. Tidak ada izin tersendiri untuknya: yang boleh
 * membaca sebuah laporan boleh membuka lampirannya, dan yang boleh mengubah
 * laporannya boleh mengurus lampirannya. Menambah izin terpisah hanya akan
 * membuat dua daftar yang harus dijaga tetap sepakat.
 */
class AttachmentPolicy
{
    /**
     * Mengunduh lampiran.
     *
     * Persis sama dengan hak membaca laporannya — kalau tidak, lampiran menjadi
     * jalan memutar untuk membaca isi laporan yang tidak boleh dilihat.
     */
    public function view(User $user, Attachment $attachment): bool
    {
        return $user->can('view', $attachment->report);
    }

    /**
     * Mengunggah lampiran ke sebuah laporan.
     *
     * Hanya penyusunnya. Berbeda dari menyunting isi, ini tetap boleh setelah
     * laporan dikirim: bukti fisik kerap baru tersedia belakangan, dan menahannya
     * hanya membuat orang menempelkannya di tempat lain.
     */
    public function create(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_BUAT)
            && $report->user_id === $user->getKey();
    }

    /**
     * Menghapus lampiran.
     *
     * Hanya selagi laporannya masih draf. Setelah dikirim, lampiran ikut menjadi
     * catatan — menghilangkan bukti dari laporan yang sudah dibaca supervisor
     * membuat riwayat tidak dapat dipercaya.
     */
    public function delete(User $user, Attachment $attachment): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_HAPUS_SENDIRI)
            && $attachment->report->user_id === $user->getKey()
            && $attachment->report->masihDraf();
    }
}
