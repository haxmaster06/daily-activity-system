<?php

namespace App\Models;

use Database\Factories\RoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/*
 * `is_system` sengaja tidak dapat diisi massal — hanya seeder yang boleh
 * menetapkannya, lewat forceFill. Peran sistem adalah peran yang slug-nya
 * dipegang kode dan seeder; membiarkannya diubah dari layar berarti
 * membiarkan aplikasi kehilangan pijakannya sendiri.
 */
#[Fillable(['slug', 'name', 'description', 'level', 'scope_level_default'])]
class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    /*
     * Slug role. Dipakai seeder dan factory — jangan menulis string mentah
     * 'admin' atau 'staff' tersebar di controller.
     *
     * Untuk memutuskan boleh-tidaknya sesuatu, pakai izin lewat
     * `User::boleh()`, bukan slug. Slug hanya identitas peran.
     */
    public const STAFF = 'staff';

    public const SUPERVISOR = 'supervisor';

    public const MANAGER = 'manager';

    public const ADMINISTRATOR = 'administrator';

    /*
     * Level lama. Sejak jangkauan data pindah ke `role_user.scope_level`,
     * tidak ada lagi kode yang membacanya — tetapi kolomnya NOT NULL tanpa
     * default, sehingga tetap harus ditulis saat membuat peran baru.
     * Penghapusannya menunggu rilis berikutnya (ADR-008).
     */
    public const LEVEL_STAFF = 10;

    public const LEVEL_SUPERVISOR = 20;

    public const LEVEL_MANAGER = 30;

    public const LEVEL_ADMINISTRATOR = 40;

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'is_system' => 'boolean',
            'scope_level_default' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    /**
     * Pengguna yang memegang peran ini, beserta jangkauan penetapannya.
     *
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['id', 'scope_level', 'department_id'])
            ->withTimestamps();
    }

    public function punyaIzin(string $kunci): bool
    {
        return $this->permissions->contains('key', $kunci);
    }
}
