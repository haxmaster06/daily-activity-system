<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu bagian laporan: satu tabel yang dibentuk dari satu template.
 */
#[Fillable(['report_template_id', 'sort_order'])]
class DailyReportSection extends Model
{
    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    /**
     * @return BelongsTo<DailyReport, $this>
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    /**
     * @return BelongsTo<ReportTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'report_template_id');
    }

    /**
     * @return HasMany<DailyReportItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(DailyReportItem::class)->orderBy('sort_order');
    }
}
