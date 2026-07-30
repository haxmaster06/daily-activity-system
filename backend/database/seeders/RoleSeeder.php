<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeder idempotent — aman dijalankan berulang, tidak pernah menghapus baris
 * (lihat docs/adr/ADR-008-larangan-fresh-migrate.md).
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'slug' => Role::STAFF,
                'name' => 'Staff',
                'level' => Role::LEVEL_STAFF,
            ],
            [
                'slug' => Role::SUPERVISOR,
                'name' => 'Supervisor',
                'level' => Role::LEVEL_SUPERVISOR,
            ],
            [
                'slug' => Role::MANAGER,
                'name' => 'Manager',
                'level' => Role::LEVEL_MANAGER,
            ],
            [
                'slug' => Role::ADMINISTRATOR,
                'name' => 'Administrator',
                'level' => Role::LEVEL_ADMINISTRATOR,
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
