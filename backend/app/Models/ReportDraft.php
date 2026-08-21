<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Draf isian laporan yang tersimpan otomatis (lihat migration report_drafts).
 */
class ReportDraft extends Model
{
    protected $fillable = [
        'user_id',
        'kunci',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
