<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu baris isian pada sebuah bagian laporan.
 *
 * Nilainya ada di `data`, berkunci `template_fields.key`. Kunci itu penanda
 * teknis dan tidak pernah ditampilkan ke pengguna — yang tampil adalah
 * `template_fields.label` (standarisasi §26).
 */
#[Fillable(['data', 'progress_status', 'sort_order'])]
class DailyReportItem extends Model
{
    public const STATUS_BELUM_MULAI = 'belum_mulai';

    public const STATUS_DALAM_PROSES = 'dalam_proses';

    public const STATUS_SELESAI = 'selesai';

    /**
     * @var array<string, string>
     */
    public const LABEL_STATUS = [
        self::STATUS_BELUM_MULAI => 'Belum Mulai',
        self::STATUS_DALAM_PROSES => 'Dalam Proses',
        self::STATUS_SELESAI => 'Selesai',
    ];

    /** Kunci kolom template yang nilainya didenormalisasi ke `progress_status`. */
    public const KUNCI_STATUS = 'status';

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<DailyReportSection, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(DailyReportSection::class, 'daily_report_section_id');
    }
}
