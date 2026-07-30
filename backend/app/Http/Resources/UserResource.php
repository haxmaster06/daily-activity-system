<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Bentuk data pengguna yang dikirim ke frontend.
     *
     * Hanya memuat apa yang dibutuhkan antarmuka. Kata sandi, token, dan
     * remember_token tidak pernah ikut (non-fungsional §9).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nama' => $this->name,
            'email' => $this->email,
            'aktif' => $this->is_active,
            'role' => [
                'slug' => $this->role?->slug,
                'nama' => $this->role?->name,
            ],
            'departemen' => [
                'id' => $this->department?->id,
                'kode' => $this->department?->code,
                'nama' => $this->department?->name,
            ],
        ];
    }
}
