<?php

namespace App\Policies;

use App\Models\User;

/**
 * Manajemen pengguna hanya untuk administrator (deny by default).
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdministrator();
    }

    public function view(User $user, User $target): bool
    {
        return $user->isAdministrator() || $user->is($target);
    }

    public function create(User $user): bool
    {
        return $user->isAdministrator();
    }

    public function update(User $user, User $target): bool
    {
        return $user->isAdministrator();
    }

    /**
     * Menonaktifkan akun.
     *
     * Administrator tidak boleh menonaktifkan dirinya sendiri — sistem bisa
     * kehilangan administrator terakhir yang dapat masuk.
     */
    public function nonaktifkan(User $user, User $target): bool
    {
        return $user->isAdministrator() && ! $user->is($target);
    }

    public function aturUlangKataSandi(User $user, User $target): bool
    {
        return $user->isAdministrator();
    }
}
