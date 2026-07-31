<?php

namespace App\Notifications;

use App\Models\DailyReport;
use App\Models\User;

/**
 * Memberi tahu penyusun bahwa laporannya sudah ditinjau.
 */
class LaporanDitinjau extends NotifikasiDams
{
    public function __construct(
        private readonly DailyReport $laporan,
        private readonly User $peninjau,
        private readonly ?string $catatan = null,
    ) {}

    protected function jenis(): string
    {
        return 'laporan_ditinjau';
    }

    protected function judul(): string
    {
        return 'Laporan Anda sudah ditinjau';
    }

    protected function pesan(): string
    {
        $dasar = sprintf(
            '%s meninjau laporan tanggal %s.',
            $this->peninjau->name,
            $this->laporan->report_date->translatedFormat('d F Y'),
        );

        // Catatan peninjau adalah bagian terpenting bagi penyusun; menyimpannya
        // hanya di detail laporan membuat notifikasi ini nyaris tidak berguna.
        return $this->catatan ? $dasar.' Catatan: '.$this->catatan : $dasar;
    }

    protected function tautan(): string
    {
        return '/laporan/'.$this->laporan->getKey();
    }
}
