<?php

namespace App\Policies;

use App\Models\DailyReport;
use App\Models\User;

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
        return true;
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
        if ($user->canSeeAllDepartments()) {
            return true;
        }

        if ($user->canMonitorTeam()) {
            return $report->department_id === $user->department_id;
        }

        return $report->user_id === $user->getKey();
    }

    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Menyunting laporan.
     *
     * Hanya pemiliknya, dan hanya selama masih draf. Laporan yang sudah
     * dikirim adalah catatan — mengubahnya setelah dibaca supervisor membuat
     * riwayat tidak dapat dipercaya.
     */
    public function update(User $user, DailyReport $report): bool
    {
        return $report->user_id === $user->getKey() && $report->masihDraf();
    }

    public function delete(User $user, DailyReport $report): bool
    {
        return $report->user_id === $user->getKey() && $report->masihDraf();
    }

    /** Mengirim laporan: hanya pemiliknya, dan hanya sekali. */
    public function kirim(User $user, DailyReport $report): bool
    {
        return $report->user_id === $user->getKey() && $report->masihDraf();
    }

    /**
     * Menandai laporan sudah ditinjau.
     *
     * Supervisor ke atas, terhadap laporan yang boleh dilihatnya, dan bukan
     * laporannya sendiri — meninjau laporan sendiri membuat tinjauan tidak
     * berarti apa-apa.
     */
    public function tinjau(User $user, DailyReport $report): bool
    {
        return $user->canMonitorTeam()
            && $report->user_id !== $user->getKey()
            && $report->status === DailyReport::STATUS_DIKIRIM
            && $this->view($user, $report);
    }
}
