<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Pengelolaan peran dan hak akses (deny by default).
 */
class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::ROLE_LIHAT);
    }

    public function view(User $user, Role $role): bool
    {
        return $user->boleh(KatalogIzin::ROLE_LIHAT);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::ROLE_KELOLA);
    }

    public function update(User $user, Role $role): bool
    {
        return $user->boleh(KatalogIzin::ROLE_KELOLA);
    }

    /**
     * Menghapus peran.
     *
     * Peran bawaan tidak dapat dihapus: slug-nya dipegang seeder, factory, dan
     * penjaga akses. Menghapusnya membuat aplikasi kehilangan pijakannya
     * sendiri, dan tidak ada layar yang dapat mengembalikannya.
     */
    public function delete(User $user, Role $role): bool
    {
        return $user->boleh(KatalogIzin::ROLE_KELOLA) && ! $role->is_system;
    }
}
