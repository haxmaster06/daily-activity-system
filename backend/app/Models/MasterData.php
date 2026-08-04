<?php

namespace App\Models;

use Database\Factories\MasterDataFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu baris pada sebuah daftar master.
 *
 * `code` dibuat server dari nama (§1.3). Yang menjaganya `MasterDataRequest`
 * yang tidak pernah menerimanya dari klien, bukan `$fillable`.
 */
#[Fillable([
    'master_type_id', 'code', 'name', 'parent_id',
    'description', 'data', 'is_active', 'sort_order',
])]
class MasterData extends Model
{
    /** @use HasFactory<MasterDataFactory> */
    use HasFactory;

    protected $table = 'master_data';

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MasterType, $this>
     */
    public function jenis(): BelongsTo
    {
        return $this->belongsTo(MasterType::class, 'master_type_id');
    }

    /**
     * @return BelongsTo<MasterData, $this>
     */
    public function induk(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<MasterData, $this>
     */
    public function turunan(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * @param  Builder<MasterData>  $query
     */
    public function scopeAktif(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Bentuk yang disalin ke dalam laporan.
     *
     * Yang disimpan salinan, bukan kunci asing. Laporan adalah arsip:
     * menghapus atau mengubah nama baris master tidak boleh mengubah isi
     * laporan yang sudah tercatat.
     *
     * @return array{kode: string, nama: string}
     */
    public function untukLaporan(): array
    {
        return ['kode' => $this->code, 'nama' => $this->name];
    }
}
