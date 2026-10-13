<?php

namespace App\Support;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Siapa yang sedang tersambung, dibaca langsung dari Reverb.
 *
 * ---------------------------------------------------------------------------
 * MENGAPA TIDAK MEMAKAI PRESENCE CHANNEL
 * ---------------------------------------------------------------------------
 *
 * Presence channel bekerja dengan cara setiap pengguna ikut bergabung, dan
 * siapa pun yang bergabung otomatis menerima daftar seluruh anggotanya. Daftar
 * siapa-sedang-online karena itu akan terbaca setiap pengguna lewat console
 * peramban — sedangkan informasi ini sengaja dibatasi. Menyembunyikan kolomnya
 * di layar bukan pembatasan akses.
 *
 * Yang dipakai sebagai gantinya: tiap pengguna yang sudah masuk SUDAH
 * berlangganan `private-App.Models.User.{id}` untuk lonceng notifikasi, dan
 * langganan itu hidup persis selama tabnya terbuka. Jadi daftar channel yang
 * sedang terisi sudah merupakan daftar siapa yang online — tanpa satu baris pun
 * kode tambahan di sisi peramban.
 *
 * Webhook Reverb akan lebih hemat, tetapi Reverb v1.11 belum memilikinya sama
 * sekali; `channel_occupied`/`channel_vacated` tidak ada di paketnya. Yang
 * tersedia adalah HTTP API yang sepadan dengan Pusher, dan itu yang dipanggil
 * di sini.
 *
 * Dibaca saat dibutuhkan, bukan disimpan. Tidak ada state yang dapat melenceng,
 * dan Reverb yang di-restart tidak meninggalkan kunci hantu.
 */
class KehadiranReverb
{
    private const AWALAN = 'private-App.Models.User.';

    /**
     * ID pengguna yang sedang tersambung.
     *
     * Reverb tidak dapat dihubungi bukan berarti semua orang offline — tetapi
     * juga bukan alasan mematikan Manajemen Pengguna. Karena itu kegagalan
     * dicatat lalu mengembalikan daftar kosong, tidak pernah melempar.
     *
     * @return list<int>
     */
    public function idPenggunaOnline(): array
    {
        try {
            $balasan = Broadcast::driver('reverb')
                ->getPusher()
                ->get('/channels', ['filter_by_prefix' => self::AWALAN]);
        } catch (Throwable $e) {
            Log::warning('Kehadiran tidak dapat dibaca dari Reverb.', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return [];
        }

        $channel = (array) ($balasan->channels ?? $balasan['channels'] ?? []);

        return collect(array_keys($channel))
            ->map(fn (string $nama) => (int) substr($nama, strlen(self::AWALAN)))
            ->filter(fn (int $id) => $id > 0)
            ->values()
            ->all();
    }
}
