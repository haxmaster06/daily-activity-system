<?php

namespace App\Policies;

use App\Models\Tugas;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 *
 * Izin menentukan **apakah** seseorang boleh menyentuh papan progres;
 * `Tugas::scopeVisibleTo()` menentukan **kartu mana**. Keduanya terpisah, dan
 * keduanya wajib — izin tanpa jangkauan membuka seluruh perusahaan.
 */
class TugasPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::TUGAS_LIHAT);
    }

    public function view(User $user, Tugas $tugas): bool
    {
        return $user->boleh(KatalogIzin::TUGAS_LIHAT) && $this->terjangkau($user, $tugas);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::TUGAS_KELOLA);
    }

    public function update(User $user, Tugas $tugas): bool
    {
        return $user->boleh(KatalogIzin::TUGAS_KELOLA) && $this->terjangkau($user, $tugas);
    }

    public function delete(User $user, Tugas $tugas): bool
    {
        return $this->update($user, $tugas);
    }

    /**
     * Kartu berada di dalam jangkauan data pengguna.
     *
     * Diperiksa lewat query yang sama dengan daftarnya, bukan dengan menyusun
     * ulang aturannya di sini — aturan yang ditulis dua kali pasti berbeda di
     * salah satunya.
     */
    private function terjangkau(User $user, Tugas $tugas): bool
    {
        return Tugas::query()
            ->visibleTo($user)
            ->whereKey($tugas->getKey())
            ->exists();
    }
}
