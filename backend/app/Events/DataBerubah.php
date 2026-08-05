<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Kabar bahwa data sebuah departemen berubah.
 *
 * ## Yang disiarkan hanya kabarnya, bukan datanya
 *
 * Muatannya sengaja tipis: departemen mana, dan jenis perubahannya. Penerimanya
 * memuat ulang halaman yang sedang dibuka lewat jalur biasa, yang sudah
 * menegakkan `scopeVisibleTo()` dan seluruh penyaring.
 *
 * Menyiarkan angkanya langsung akan lebih cepat, dan salah. Angka Executive
 * Analytics bergantung pada jangkauan data tiap penonton — satu muatan yang
 * sama tidak dapat benar bagi Direktur korporat dan supervisor satu departemen
 * sekaligus. Menyiarkannya berarti mengirim angka departemen lain kepada orang
 * yang tidak boleh melihatnya.
 *
 * ## Channel per departemen, bukan satu channel bersama
 *
 * Otorisasinya di `routes/channels.php`: hanya yang jangkauannya mencakup
 * departemen itu yang boleh mendengarkan. Satu channel bersama berarti siapa pun
 * yang sudah masuk tahu departemen mana yang sedang sibuk — bocoran kecil,
 * tetapi bocoran.
 */
class DataBerubah implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public const LAPORAN = 'laporan';

    public const TUGAS = 'tugas';

    public function __construct(
        public readonly int $departemenId,
        /** `laporan` atau `tugas`. */
        public readonly string $jenis,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("departemen.{$this->departemenId}")];
    }

    public function broadcastAs(): string
    {
        return 'data.berubah';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'departemen_id' => $this->departemenId,
            'jenis' => $this->jenis,
        ];
    }
}
