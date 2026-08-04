<?php

namespace App\Policies;

use App\Models\MasterType;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 *
 * Membaca daftar jenis dibutuhkan siapa pun yang mengisi laporan berkolom
 * master; mengubahnya hanya oleh yang memegang pengelolaan daftar master.
 */
class MasterTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::MASTER_LIHAT);
    }

    public function view(User $user, MasterType $jenis): bool
    {
        return $user->boleh(KatalogIzin::MASTER_LIHAT);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }

    public function update(User $user, MasterType $jenis): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }

    public function delete(User $user, MasterType $jenis): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }
}
