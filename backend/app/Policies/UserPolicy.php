<?php

namespace App\Policies;

use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Manajemen pengguna (deny by default).
 *
 * Wewenangnya dipecah menjadi beberapa izin terpisah, sehingga peran seperti
 * HRD dapat diberi hak menonaktifkan akun tanpa sekalian diberi hak mengubah
 * peran orang lain.
 *
 * Pemisahan itu membuka kemungkinan yang sebelumnya tidak ada: pemegang satu
 * izin dapat menghabiskan pemegang izin lainnya. Yang menjaganya adalah
 * `App\Support\PenjagaAkses`, bukan Policy ini.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_LIHAT);
    }

    public function view(User $user, User $target): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_LIHAT) || $user->is($target);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_KELOLA);
    }

    public function update(User $user, User $target): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_KELOLA);
    }

    /**
     * Menonaktifkan akun.
     *
     * Tidak boleh menonaktifkan dirinya sendiri — pengelola bisa mengunci
     * dirinya keluar tanpa ada yang dapat memulihkannya.
     */
    public function nonaktifkan(User $user, User $target): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_NONAKTIFKAN) && ! $user->is($target);
    }

    public function aturUlangKataSandi(User $user, User $target): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_ATUR_KATA_SANDI);
    }

    /**
     * Menghapus akun permanen.
     *
     * Seluruh laporan dan lampirannya ikut terhapus permanen. Akibat itu
     * disampaikan lebih dulu di layar; di sini yang dijaga hanya dua hal yang
     * tidak boleh terjadi bagaimanapun keadaannya.
     *
     * Akun sistem — administrator awal dari seeder — tidak pernah dapat
     * dihapus: ia satu-satunya jalan masuk bila tidak ada akun lain tersisa.
     * Menghapus diri sendiri juga ditolak, sama seperti menonaktifkan.
     */
    public function delete(User $user, User $target): bool
    {
        return $user->boleh(KatalogIzin::PENGGUNA_KELOLA)
            && ! $user->is($target)
            && $target->dapatDihapus();
    }
}
