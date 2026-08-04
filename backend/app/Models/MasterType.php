<?php

namespace App\Models;

use Database\Factories\MasterTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Jenis daftar master.
 *
 * `slug` dibuat server dari nama dan tidak pernah berubah setelahnya (§1.3).
 * Yang menjaganya bukan `$fillable` melainkan `MasterTypeRequest`, yang tidak
 * pernah menerimanya dari klien — sama seperti `code` pada Department.
 *
 * `is_system` sengaja **di luar** fillable: hanya seeder yang menandainya lewat
 * `forceFill`, sama seperti peran dan departemen sistem.
 */
#[Fillable(['slug', 'name', 'parent_type_id', 'description', 'sort_order'])]
class MasterType extends Model
{
    /** @use HasFactory<MasterTypeFactory> */
    use HasFactory;

    /** Daftar satuan bawaan — dipakai kolom angka bersatuan. */
    public const SLUG_SATUAN = 'satuan';

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Jenis induknya. Jenis LOT berinduk jenis Supplier.
     *
     * @return BelongsTo<MasterType, $this>
     */
    public function induk(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_type_id');
    }

    /**
     * @return HasMany<MasterType, $this>
     */
    public function turunan(): HasMany
    {
        return $this->hasMany(self::class, 'parent_type_id');
    }

    /**
     * @return HasMany<MasterData, $this>
     */
    public function isi(): HasMany
    {
        return $this->hasMany(MasterData::class);
    }

    public function berinduk(): bool
    {
        return $this->parent_type_id !== null;
    }
}
