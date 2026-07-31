<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Support\JangkauanData;
use Illuminate\Database\Seeder;

/**
 * Seeder idempotent — aman dijalankan berulang, tidak pernah menghapus baris
 * (lihat docs/adr/ADR-008-larangan-fresh-migrate.md).
 *
 * `scope_level_default` hanya mengisi pilihan di layar saat penetapan baru
 * dibuat. Jangkauan yang berlaku ada di `role_user.scope_level`.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'slug' => Role::STAFF,
                'name' => 'Staff',
                'description' => 'Mengisi dan mengirim laporan hariannya sendiri.',
                'level' => Role::LEVEL_STAFF,
                'scope_level_default' => JangkauanData::PERSONAL,
            ],
            [
                'slug' => Role::SUPERVISOR,
                'name' => 'Supervisor',
                'description' => 'Memantau dan meninjau laporan anggota departemennya.',
                'level' => Role::LEVEL_SUPERVISOR,
                'scope_level_default' => JangkauanData::DEPARTEMEN,
            ],
            [
                'slug' => Role::MANAGER,
                'name' => 'Manager',
                'description' => 'Memantau dan meninjau laporan seluruh departemen.',
                'level' => Role::LEVEL_MANAGER,
                'scope_level_default' => JangkauanData::KORPORAT,
            ],
            [
                'slug' => Role::ADMINISTRATOR,
                'name' => 'Administrator',
                'description' => 'Mengelola pengguna, peran, departemen, dan template.',
                'level' => Role::LEVEL_ADMINISTRATOR,
                'scope_level_default' => JangkauanData::KORPORAT,
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role)
                // Tidak dapat diisi massal — lihat catatan di model Role.
                ->forceFill(['is_system' => true])
                ->save();
        }
    }
}
