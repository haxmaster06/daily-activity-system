<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['uploaded_by', 'original_name', 'path', 'mime_type', 'size_bytes'])]
class Attachment extends Model
{
    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }

    /**
     * @return BelongsTo<DailyReport, $this>
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function pengunggah(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
