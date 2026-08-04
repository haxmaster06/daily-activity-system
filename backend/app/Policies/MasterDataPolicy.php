<?php

namespace App\Policies;

use App\Models\MasterData;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 */
class MasterDataPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::MASTER_LIHAT);
    }

    public function view(User $user, MasterData $baris): bool
    {
        return $user->boleh(KatalogIzin::MASTER_LIHAT);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }

    public function update(User $user, MasterData $baris): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }

    public function delete(User $user, MasterData $baris): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA);
    }
}
