<?php

namespace App\Notifications;

use App\Models\DailyReport;

/**
 * Memberi tahu supervisor bahwa seorang anggota timnya mengirim laporan.
 */
class LaporanDikirim extends NotifikasiDams
{
    public function __construct(private readonly DailyReport $laporan) {}

    protected function jenis(): string
    {
        return 'laporan_dikirim';
    }

    protected function judul(): string
    {
        return 'Laporan baru dikirim';
    }

    protected function pesan(): string
    {
        return sprintf(
            '%s mengirim laporan tanggal %s.',
            $this->laporan->user?->name ?? 'Seorang anggota',
            $this->laporan->report_date->translatedFormat('d F Y'),
        );
    }

    protected function tautan(): string
    {
        return '/laporan/'.$this->laporan->getKey();
    }
}
