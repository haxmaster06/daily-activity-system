<?php

namespace App\Http\Resources;

use App\Models\Role;
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
        $peranUtama = $this->roleUtama();
        $sendiri = $request->user()?->is($this->resource) ?? false;

        return [
            'id' => $this->id,
            'nama' => $this->name,
            'email' => $this->email,
            'aktif' => $this->is_active,

            // Peran utama, untuk pelabelan ringkas di tabel dan bilah navigasi.
            'role' => [
                'slug' => $peranUtama?->slug,
                'nama' => $peranUtama?->name,
            ],

            'penetapan' => $this->roles->map(fn (Role $peran) => [
                'id' => $peran->pivot->id,
                'role_id' => $peran->getKey(),
                'slug' => $peran->slug,
                'nama' => $peran->name,
                'scope_level' => (int) $peran->pivot->scope_level,
                /*
                 * Hanya id departemennya, bukan objek — memuat relasinya per
                 * baris berarti lazy loading, dan itu menggagalkan permintaan.
                 * Layar pengguna sudah memuat daftar departemen lengkap.
                 */
                'department_id' => $peran->pivot->department_id === null
                    ? null
                    : (int) $peran->pivot->department_id,
            ])->values(),

            'departemen' => [
                'id' => $this->department?->id,
                'kode' => $this->department?->code,
                'nama' => $this->department?->name,
            ],

            /*
             * Jangkauan dan daftar izin hanya untuk dirinya sendiri.
             *
             * Pada daftar seratus pengguna, mengirimkannya untuk semua orang
             * berarti ribuan baris izin sekali muat — dan membocorkan susunan
             * hak akses tiap orang kepada siapa pun yang boleh melihat daftar.
             */
            'jangkauan' => $this->when($sendiri, fn () => [
                'level' => $this->jangkauan()->level,
                // Angka tingkat tidak boleh menjadi label layar.
                'label' => $this->jangkauan()->label(),
                'departemen_id' => $this->jangkauan()->departemenId,
            ]),

            'izin' => $this->when($sendiri, fn () => $this->daftarIzin()->all()),
        ];
    }
}
