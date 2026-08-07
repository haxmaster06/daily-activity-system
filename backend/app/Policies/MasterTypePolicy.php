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
        return $user->boleh(KatalogIzin::MASTER_KELOLA) && $user->jangkauan()->korporat();
    }

    public function update(User $user, MasterType $jenis): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA) && $user->jangkauan()->korporat();
    }

    public function delete(User $user, MasterType $jenis): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA) && $user->jangkauan()->korporat();
    }

    /**
     * Menetapkan departemen mana yang berwenang mengelola isi jenis ini.
     *
     * Hanya pemegang jangkauan korporat. Membiarkannya ikut `master.kelola`
     * membuat pembatasannya tidak berarti apa-apa: siapa pun yang dibatasi
     * cukup menambahkan departemennya sendiri ke daftar pengelola, dan batas
     * itu terbuka sendiri.
     */
    public function aturPengelola(User $user): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA) && $user->jangkauan()->korporat();
    }
}
