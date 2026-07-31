<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Dasar seluruh notifikasi DAMS.
 *
 * Hanya channel `database` yang dipakai. Email belum disiapkan, dan
 * mengaktifkannya diam-diam akan mengirim alamat karyawan ke layanan luar.
 *
 * Notifikasi dikirim langsung, tanpa antrean: menulis satu baris jauh lebih
 * murah daripada menjaga agar pekerja antrean selalu hidup, dan lonceng yang
 * kosong karena pekerja mati lebih buruk daripada permintaan yang sedikit
 * lebih lama.
 */
abstract class NotifikasiDams extends Notification
{
    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Penanda jenis agar antarmuka dapat memilih ikon tanpa membaca nama kelas.
     */
    abstract protected function jenis(): string;

    abstract protected function judul(): string;

    abstract protected function pesan(): string;

    /** Tujuan saat notifikasi diklik. Null berarti tidak dapat diklik. */
    protected function tautan(): ?string
    {
        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'jenis' => $this->jenis(),
            'judul' => $this->judul(),
            'pesan' => $this->pesan(),
            'tautan' => $this->tautan(),
        ];
    }
}
