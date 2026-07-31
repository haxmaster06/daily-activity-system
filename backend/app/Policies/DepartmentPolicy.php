<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 *
 * Seluruh pengguna yang sudah masuk boleh membaca daftar departemen — nama
 * departemen dibutuhkan hampir di setiap layar. Perubahan hanya oleh
 * administrator.
 */
class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::DEPARTEMEN_LIHAT);
    }

    public function view(User $user, Department $department): bool
    {
        return $user->boleh(KatalogIzin::DEPARTEMEN_LIHAT);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::DEPARTEMEN_KELOLA);
    }

    public function update(User $user, Department $department): bool
    {
        return $user->boleh(KatalogIzin::DEPARTEMEN_KELOLA);
    }

    public function delete(User $user, Department $department): bool
    {
        return $user->boleh(KatalogIzin::DEPARTEMEN_KELOLA);
    }
}
