<?php

namespace Database\Factories;

use App\Models\Permission;
use App\Models\Role;
use App\Support\JangkauanData;
use App\Support\KatalogIzin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    /**
     * @var array<string, array{name: string, level: int, scope_level_default: int}>
     */
    private const BAWAAN = [
        Role::STAFF => [
            'name' => 'Staff',
            'level' => Role::LEVEL_STAFF,
            'scope_level_default' => JangkauanData::PERSONAL,
        ],
        Role::SUPERVISOR => [
            'name' => 'Supervisor',
            'level' => Role::LEVEL_SUPERVISOR,
            'scope_level_default' => JangkauanData::DEPARTEMEN,
        ],
        Role::MANAGER => [
            'name' => 'Manager',
            'level' => Role::LEVEL_MANAGER,
            'scope_level_default' => JangkauanData::KORPORAT,
        ],
        Role::ADMINISTRATOR => [
            'name' => 'Administrator',
            'level' => Role::LEVEL_ADMINISTRATOR,
            'scope_level_default' => JangkauanData::KORPORAT,
        ],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => Role::STAFF,
            'name' => 'Staff',
            'level' => Role::LEVEL_STAFF,
        ];
    }

    /**
     * Mengambil role dengan slug tertentu, membuatnya bila belum ada.
     *
     * Role bersifat master data dengan slug unik, sehingga test tidak boleh
     * membuat duplikat setiap kali membutuhkan satu role.
     *
     * Untuk empat slug bawaan, izinnya sekalian dipasang — tanpa itu seluruh
     * pemeriksaan `boleh()` bernilai false dan hampir setiap test gagal.
     *
     * Slug di luar keempatnya memperoleh peran TANPA izin sama sekali. Itu
     * memang deny by default, tetapi test yang membuat peran karangan lalu
     * mengharapkan akses akan gagal dengan cara yang membingungkan — pasang
     * izinnya sendiri.
     */
    public static function slug(string $slug): Role
    {
        $atribut = self::BAWAAN[$slug] ?? ['name' => ucfirst($slug), 'level' => Role::LEVEL_STAFF];

        $peran = Role::firstOrCreate(['slug' => $slug], $atribut);

        $kunciIzin = KatalogIzin::bawaanPeran()[$slug] ?? [];

        // Empat slug bawaan ditandai peran sistem, sama seperti RoleSeeder.
        // Tanpa ini test tidak pernah menguji larangan menghapusnya.
        if (isset(self::BAWAAN[$slug]) && ! $peran->is_system) {
            $peran->forceFill(['is_system' => true])->save();
        }

        if ($kunciIzin !== []) {
            $peran->permissions()->syncWithoutDetaching(
                Permission::whereIn('key', $kunciIzin)->pluck('id')->all(),
            );
        }

        return $peran;
    }
}
