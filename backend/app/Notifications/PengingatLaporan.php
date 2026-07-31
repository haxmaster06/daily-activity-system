<?php

namespace App\Notifications;

use App\Models\User;
use Carbon\CarbonInterface;

/**
 * Pengingat agar seorang anggota mengisi laporan hariannya.
 *
 * Dikirim supervisor dari halaman Monitoring, bukan otomatis — yang tahu
 * seseorang sedang cuti atau sedang di lapangan adalah atasannya, bukan
 * penjadwal.
 */
class PengingatLaporan extends NotifikasiDams
{
    public function __construct(
        private readonly User $pengirim,
        private readonly CarbonInterface $tanggal,
    ) {}

    protected function jenis(): string
    {
        return 'pengingat_laporan';
    }

    protected function judul(): string
    {
        return 'Pengingat laporan harian';
    }

    protected function pesan(): string
    {
        return sprintf(
            '%s mengingatkan Anda untuk mengisi laporan tanggal %s.',
            $this->pengirim->name,
            $this->tanggal->translatedFormat('d F Y'),
        );
    }

    protected function tautan(): string
    {
        return '/laporan/baru';
    }
}
