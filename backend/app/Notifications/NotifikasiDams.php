<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Dasar seluruh notifikasi DAMS.
 *
 * Dua channel: `database` menyimpannya agar tetap ada setelah dimuat ulang, dan
 * `broadcast` mendorongnya ke lonceng seketika lewat Reverb. Email belum
 * disiapkan, dan mengaktifkannya diam-diam akan mengirim alamat karyawan ke
 * layanan luar.
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
        return ['database', 'broadcast'];
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

    /**
     * Isi yang didorong ke peramban.
     *
     * Bentuknya disamakan dengan yang dikembalikan `GET /api/notifikasi`,
     * sehingga lonceng dapat menyisipkannya langsung tanpa memanggil server
     * lagi — itulah gunanya mendorong, bukan sekadar memberi tahu ada yang
     * baru.
     *
     * `id` notifikasi diisi Laravel sesudah baris database dibuat.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'jenis' => $this->jenis(),
            'judul' => $this->judul(),
            'pesan' => $this->pesan(),
            'tautan' => $this->tautan(),
            'dibaca' => false,
            'waktu' => now()->toIso8601String(),
        ]);
    }
}
