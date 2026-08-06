<?php

namespace App\Policies;

use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 *
 * ## Membaca terbuka, mengelola terikat departemen
 *
 * Daftar master dibaca siapa saja yang memegang `master.lihat` — kolom laporan
 * yang mengambil pilihannya dari daftar master tidak dapat diisi tanpa itu, dan
 * membatasi bacaan berarti membatasi pengisian laporan.
 *
 * Yang dibatasi adalah mengelolanya. Yang mengenal isi sebuah daftar adalah
 * unit kerja yang memakainya sehari-hari: Supplier dipegang Purchasing, Produk
 * dipegang Produksi, Customer dipegang Produksi bersama Marketing. Daftar
 * master yang salah tidak berhenti di satu layar — seluruh laporan yang memilih
 * dari sana ikut membawanya.
 *
 * ## Dua jalan menembus batas itu
 *
 * Pemegang jangkauan korporat — Administrator dan Management — tetap dapat
 * mengelola seluruh jenis. Mereka memang membaca lintas departemen, dan tanpa
 * jalan ini tidak ada seorang pun yang dapat memperbaiki daftar milik
 * departemen yang sedang tidak punya pengelola aktif.
 *
 * Jenis yang belum ditetapkan departemen pengelolanya juga tetap terbuka bagi
 * pemegang `master.kelola`. Itu yang membuat aturan ini tidak mencabut akses
 * siapa pun saat pertama kali dipasang.
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

    /**
     * Menambah isi pada satu jenis master.
     *
     * Jenisnya wajib disebut pemanggil — tanpa itu tidak ada yang dapat
     * ditimbang selain izinnya, dan pembatasan departemen tidak berlaku sama
     * sekali.
     */
    public function create(User $user, ?MasterType $jenis = null): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA)
            && $this->bolehKelolaJenis($user, $jenis);
    }

    public function update(User $user, MasterData $baris): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA)
            && $this->bolehKelolaJenis($user, $baris->jenis);
    }

    public function delete(User $user, MasterData $baris): bool
    {
        return $user->boleh(KatalogIzin::MASTER_KELOLA)
            && $this->bolehKelolaJenis($user, $baris->jenis);
    }

    private function bolehKelolaJenis(User $user, ?MasterType $jenis): bool
    {
        if ($jenis === null) {
            return false;
        }

        if ($user->jangkauan()->korporat()) {
            return true;
        }

        return $jenis->dikelolaDepartemen($user->department_id);
    }
}
