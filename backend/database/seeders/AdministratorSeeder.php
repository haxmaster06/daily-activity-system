<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Membuat satu akun administrator awal agar sistem dapat dipakai.
 *
 * Kata sandi tidak pernah ditanam di kode. Di luar environment lokal, seeder
 * menuntut `DAMS_ADMIN_EMAIL` dan `DAMS_ADMIN_PASSWORD` disetel lewat
 * environment (non-fungsional §10, Secret Management).
 *
 * Idempotent: menjalankan ulang tidak menimpa kata sandi administrator yang
 * sudah ada.
 */
class AdministratorSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('DAMS_ADMIN_EMAIL', 'admin@hbmcorp.co.id');
        $password = env('DAMS_ADMIN_PASSWORD');

        if ($password === null) {
            if (app()->environment('production')) {
                throw new RuntimeException(
                    'DAMS_ADMIN_PASSWORD wajib disetel di environment sebelum menjalankan seeder pada produksi.',
                );
            }

            $password = 'password';
            $this->command?->warn(
                'Kata sandi administrator memakai nilai bawaan pengembangan. '.
                'Setel DAMS_ADMIN_PASSWORD sebelum dipakai di luar mesin lokal.',
            );
        }

        $administrator = Role::where('slug', Role::ADMINISTRATOR)->first();
        $department = Department::where('code', 'DOC_CONTROL')->first();

        if ($administrator === null || $department === null) {
            throw new RuntimeException(
                'RoleSeeder dan DepartmentSeeder harus dijalankan lebih dulu.',
            );
        }

        $sudahAda = User::where('email', $email)->exists();

        $user = User::firstOrNew(['email' => $email]);
        $user->name = env('DAMS_ADMIN_NAME', 'Administrator DAMS');
        $user->department_id = $department->id;
        $user->role_id = $administrator->id;
        $user->is_active = true;

        // Kata sandi hanya disetel saat akun dibuat pertama kali, agar
        // menjalankan ulang seeder tidak mengembalikan kata sandi lama.
        if (! $sudahAda) {
            $user->password = $password;
        }

        $user->save();

        $this->command?->info(
            $sudahAda
                ? "Administrator [{$email}] sudah ada — kata sandi tidak diubah."
                : "Administrator [{$email}] dibuat.",
        );
    }
}
