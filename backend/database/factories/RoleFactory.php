<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    /**
     * @var array<string, array{name: string, level: int}>
     */
    private const BAWAAN = [
        Role::STAFF => ['name' => 'Staff', 'level' => Role::LEVEL_STAFF],
        Role::SUPERVISOR => ['name' => 'Supervisor', 'level' => Role::LEVEL_SUPERVISOR],
        Role::MANAGER => ['name' => 'Manager', 'level' => Role::LEVEL_MANAGER],
        Role::ADMINISTRATOR => ['name' => 'Administrator', 'level' => Role::LEVEL_ADMINISTRATOR],
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
     */
    public static function slug(string $slug): Role
    {
        $atribut = self::BAWAAN[$slug] ?? ['name' => ucfirst($slug), 'level' => Role::LEVEL_STAFF];

        return Role::firstOrCreate(['slug' => $slug], $atribut);
    }
}
