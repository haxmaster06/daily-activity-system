<?php

namespace App\Models;

use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'is_active'])]
class Department extends Model
{
    /**
     * Departemen milik akun sistem.
     *
     * Bukan unit kerja: tidak muncul sebagai pilihan, tidak dapat diberikan ke
     * akun lain, dan tidak ikut terhitung pada monitoring maupun rekap.
     */
    public const KODE_SISTEM = 'SISTEM';

    /** @use HasFactory<DepartmentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @param  Builder<Department>  $query
     */
    public function scopeAktif(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
