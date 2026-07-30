<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

/**
 * Baris jejak audit. Append-only — lihat non-fungsional §11.
 *
 * Model ini sengaja menolak `update()` dan `delete()` agar riwayat tidak dapat
 * diubah lewat kode aplikasi, baik sengaja maupun tidak.
 */
#[Fillable([
    'user_id', 'user_name', 'action', 'module',
    'auditable_type', 'auditable_id', 'description',
    'changes', 'ip_address', 'user_agent',
])]
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new RuntimeException('Jejak audit bersifat append-only dan tidak dapat diubah.');
        });

        static::deleting(function (): never {
            throw new RuntimeException('Jejak audit bersifat append-only dan tidak dapat dihapus.');
        });
    }
}
