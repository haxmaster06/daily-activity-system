<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Satu hak akses.
 *
 * Barisnya adalah proyeksi `App\Support\KatalogIzin` — sumber kebenarannya ada
 * di kode. Layar hanya mencentang izin untuk sebuah peran, tidak pernah membuat
 * atau menghapus izin.
 */
#[Fillable(['key', 'group_key', 'name', 'description', 'sort_order'])]
class Permission extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
