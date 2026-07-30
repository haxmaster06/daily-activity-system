<?php

namespace App\Models;

use Database\Factories\RoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'level'])]
class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    /*
     * Slug role. Dipakai di Policy dan pemeriksaan izin — jangan menulis
     * string mentah 'admin' atau 'staff' tersebar di controller.
     */
    public const STAFF = 'staff';

    public const SUPERVISOR = 'supervisor';

    public const MANAGER = 'manager';

    public const ADMINISTRATOR = 'administrator';

    /*
     * Level menyatakan luas jangkauan data. Makin besar makin luas.
     */
    public const LEVEL_STAFF = 10;

    public const LEVEL_SUPERVISOR = 20;

    public const LEVEL_MANAGER = 30;

    public const LEVEL_ADMINISTRATOR = 40;

    protected function casts(): array
    {
        return [
            'level' => 'integer',
        ];
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
