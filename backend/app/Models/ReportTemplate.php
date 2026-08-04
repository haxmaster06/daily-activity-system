<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'department_id', 'code', 'name', 'description',
    'sort_order', 'is_active', 'version', 'parent_id', 'bentuk_pengisian',
])]
class ReportTemplate extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'version' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<TemplateField, $this>
     */
    public function fields(): HasMany
    {
        return $this->hasMany(TemplateField::class)->orderBy('sort_order');
    }

    /**
     * Versi sebelumnya dari template ini.
     *
     * @return BelongsTo<ReportTemplate, $this>
     */
    public function induk(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'parent_id');
    }

    /**
     * Template yang berlaku untuk sebuah departemen: miliknya sendiri
     * ditambah template lintas departemen seperti AKTIVITAS_UMUM.
     *
     * @param  Builder<ReportTemplate>  $query
     */
    public function scopeUntukDepartemen(Builder $query, ?int $departmentId): void
    {
        $query->where(function (Builder $sub) use ($departmentId) {
            $sub->whereNull('department_id');

            if ($departmentId !== null) {
                $sub->orWhere('department_id', $departmentId);
            }
        });
    }

    /**
     * @param  Builder<ReportTemplate>  $query
     */
    public function scopeAktif(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** Template lintas departemen — dipakai semua orang. */
    public function berlakuUmum(): bool
    {
        return $this->department_id === null;
    }
}
