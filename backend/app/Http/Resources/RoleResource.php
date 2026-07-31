<?php

namespace App\Http\Resources;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Role
 */
class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'nama' => $this->name,
            'keterangan' => $this->description,

            // Peran bawaan tidak dapat dihapus dan namanya melekat pada kode.
            'sistem' => (bool) $this->is_system,

            // Hanya untuk mengisi pilihan di layar saat penetapan baru dibuat.
            // Jangkauan yang berlaku ada di penetapan, bukan di sini.
            'jangkauan_bawaan' => $this->scope_level_default,

            'jumlah_pengguna' => $this->whenCounted('users'),
            'izin' => $this->whenLoaded(
                'permissions',
                fn () => $this->permissions->pluck('key')->all(),
            ),
        ];
    }
}
