<?php

namespace App\Policies;

use App\Models\DailyReport;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Izin laporan harian (deny by default).
 *
 * Jangkauan **membaca** dipusatkan di `DailyReport::scopeVisibleTo()`, bukan
 * ditulis ulang di sini — Policy ini mengatur apa yang boleh dilakukan
 * terhadap satu laporan tertentu.
 */
class DailyReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_LIHAT);
    }

    /**
     * Membaca satu laporan.
     *
     * Aturannya sengaja disamakan persis dengan `scopeVisibleTo` supaya daftar
     * dan detail tidak pernah berbeda pendapat: laporan yang tidak muncul di
     * daftar juga tidak dapat dibuka lewat alamat langsung.
     */
    public function view(User $user, DailyReport $report): bool
    {
        if (! $user->boleh(KatalogIzin::LAPORAN_LIHAT)) {
            return false;
        }

        // Super Admin melihat segalanya, termasuk draf orang lain. Harus sejalan
        // dengan DailyReport::scopeVisibleTo() — daftar dan detail wajib sepakat.
        if ($user->is_system) {
            return true;
        }

        $jangkauan = $user->jangkauan();

        $dalamJangkauan = $jangkauan->korporat()
            || $report->user_id === $user->getKey()
            || $jangkauan->mencakupDepartemen($report->department_id);

        if (! $dalamJangkauan) {
            return false;
        }

        // Draf berarti belum dipublikasikan: hanya pembuatnya yang boleh
        // membukanya. Berlaku bagi jangkauan korporat sekalipun (Management).
        return $report->status !== DailyReport::STATUS_DRAF
            || $report->user_id === $user->getKey();
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_BUAT);
    }

    /**
     * Menyunting laporan.
     *
     * Hanya pemiliknya — tetapi tidak dibatasi statusnya.
     *
     * Sebelumnya penyuntingan berhenti begitu laporan dikirim, dengan alasan
     * menjaga riwayat tetap dapat dipercaya. Aturan itu dicabut atas keputusan
     * pemilik project: ini catatan aktivitas harian, bukan pengajuan yang
     * mengikat. Yang terjadi di lapangan adalah pengisi menemukan salah ketik
     * satu jam kemudian dan tidak punya jalan memperbaikinya, lalu membuat
     * laporan kedua di hari yang sama — dan justru itu yang membuat riwayatnya
     * tidak dapat dipercaya.
     *
     * Yang menjaga ketelusuran kini catatan audit, bukan penguncian: tiap
     * perubahan tercatat beserta pelakunya dan waktunya.
     */
    public function update(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_UBAH_SENDIRI)
            && $report->user_id === $user->getKey();
    }

    /**
     * Menghapus laporan permanen.
     *
     * Dua batasan dicabut sekaligus, keduanya sudah tidak berpijak pada apa pun:
     *
     * `masihDraf()` — sejak laporan langsung terbit tanpa tahap draf, praktis
     * tidak ada laporan berstatus draf, sehingga tidak ada yang dapat dihapus
     * pemiliknya sendiri.
     *
     * Kepemilikan mutlak — Administrator memegang seluruh izin tetapi tetap
     * gagal pada `user_id === getKey()`, jadi tidak ada satu pun jalan
     * membersihkan laporan yang salah masuk.
     *
     * Jangkauan Korporat dipakai sebagai penggantinya, bukan izin baru: yang
     * berjangkauan Korporat sudah melihat seluruh laporan lewat
     * `scopeVisibleTo()`, jadi siapa yang boleh menyentuh apa tetap diputuskan
     * satu acuan. Jangkauan departemen sengaja TIDAK cukup — melihat laporan
     * rekan sedepartemen adalah satu hal, menghapusnya hal lain.
     */
    public function delete(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_HAPUS_SENDIRI)
            && ($report->user_id === $user->getKey() || $user->jangkauan()->korporat());
    }

    /**
     * Mengirim laporan — hanya pemiliknya, dan boleh berulang kali.
     *
     * Batasan "hanya sekali" dicabut menyusul dibukanya penyuntingan sesudah
     * kirim. Selama laporan masih dapat berubah, harus ada cara menyatakan
     * bahwa isinya berubah; tanpa itu suntingan mendarat diam-diam dan
     * peninjau tidak pernah tahu.
     *
     * Statusnya karena itu tidak dibatasi. Yang dibatasi tetap kepemilikannya:
     * mengirim laporan orang lain berarti menyatakan atas nama orang itu.
     */
    public function kirim(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_KIRIM)
            && $report->user_id === $user->getKey();
    }

    /**
     * Menandai laporan sudah ditinjau.
     *
     * Terhadap laporan yang boleh dilihatnya, dan bukan laporannya sendiri —
     * meninjau laporan sendiri membuat tinjauan tidak berarti apa-apa.
     */
    public function tinjau(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_TINJAU)
            && $report->user_id !== $user->getKey()
            && $report->status === DailyReport::STATUS_DIKIRIM
            && $this->view($user, $report);
    }

    /**
     * Menduplikat laporan menjadi laporan baru miliknya sendiri.
     *
     * Hanya laporan sendiri. Menyalin isi laporan orang lain akan menempatkan
     * tulisan yang ditulis orang itu di bawah nama penggunanya — dan pada
     * catatan aktivitas harian, siapa yang menulis apa adalah seluruh isinya.
     *
     * Statusnya tidak dibatasi: laporan lama yang sudah dikirim justru yang
     * paling sering ingin ditiru.
     */
    public function duplikat(User $user, DailyReport $report): bool
    {
        return $user->boleh(KatalogIzin::LAPORAN_BUAT)
            && $report->user_id === $user->getKey();
    }
}
