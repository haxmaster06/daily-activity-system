<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PengingatController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportTemplateController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rute API DAMS
|--------------------------------------------------------------------------
|
| Seluruh rute mengembalikan envelope { success, message, data }.
| Rute yang menyentuh data wajib memakai middleware `auth:sanctum` dan
| pemeriksaan izin lewat Policy — deny by default (non-fungsional §2.3).
|
*/

Route::get('/health', HealthController::class)->name('health');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('login');

Route::middleware(['auth:sanctum', 'aktif', 'throttle:api'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me'])->name('me');

    /*
     * Ringkasan. Angkanya dibatasi DailyReport::scopeVisibleTo() — pengguna
     * tidak boleh melihat angka yang mencakup laporan di luar jangkauannya.
     * Monitoring menolak Staff sejak di controller.
     */
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/monitoring', MonitoringController::class)->name('monitoring');

    /*
     * Notifikasi. Relasi `notifications()` sudah terikat pada pemiliknya,
     * sehingga tidak ada jalan membaca notifikasi pengguna lain.
     *
     * Pengingat dibatasi lebih ketat: Supervisor ke atas, dan Supervisor hanya
     * untuk departemennya sendiri.
     */
    Route::get('/notifikasi', [NotifikasiController::class, 'index'])->name('notifikasi.index');
    Route::post('/notifikasi/baca-semua', [NotifikasiController::class, 'bacaSemua'])
        ->name('notifikasi.baca-semua');
    Route::post('/notifikasi/{notifikasi}/baca', [NotifikasiController::class, 'baca'])
        ->name('notifikasi.baca');
    Route::post('/monitoring/pengingat', PengingatController::class)
        ->middleware('throttle:pengingat')
        ->name('monitoring.pengingat');

    // Profil sendiri — tidak memerlukan role khusus.
    Route::get('/profil', [ProfileController::class, 'show'])->name('profil.show');
    Route::put('/profil', [ProfileController::class, 'update'])->name('profil.update');
    Route::put('/profil/kata-sandi', [ProfileController::class, 'ubahKataSandi'])
        ->name('profil.kata-sandi');

    // Master data. Pembatasan sebenarnya ditegakkan Policy pada tiap aksi.
    Route::get('/departemen', [DepartmentController::class, 'index'])->name('departemen.index');
    Route::post('/departemen', [DepartmentController::class, 'store'])->name('departemen.store');
    Route::put('/departemen/{department}', [DepartmentController::class, 'update'])
        ->name('departemen.update');
    Route::delete('/departemen/{department}', [DepartmentController::class, 'destroy'])
        ->name('departemen.destroy');

    Route::get('/role', [UserController::class, 'roles'])->name('role.index');
    Route::get('/pengguna', [UserController::class, 'index'])->name('pengguna.index');
    Route::post('/pengguna', [UserController::class, 'store'])->name('pengguna.store');
    Route::put('/pengguna/{user}', [UserController::class, 'update'])->name('pengguna.update');
    Route::put('/pengguna/{user}/status', [UserController::class, 'ubahStatus'])
        ->name('pengguna.status');
    Route::put('/pengguna/{user}/kata-sandi', [UserController::class, 'aturUlangKataSandi'])
        ->name('pengguna.kata-sandi');

    Route::get('/template/opsi-kolom', [ReportTemplateController::class, 'opsiKolom'])
        ->name('template.opsi-kolom');
    Route::get('/template', [ReportTemplateController::class, 'index'])->name('template.index');
    Route::post('/template', [ReportTemplateController::class, 'store'])->name('template.store');
    Route::get('/template/{template}', [ReportTemplateController::class, 'show'])
        ->name('template.show');
    Route::put('/template/{template}', [ReportTemplateController::class, 'update'])
        ->name('template.update');
    Route::delete('/template/{template}', [ReportTemplateController::class, 'destroy'])
        ->name('template.destroy');

    /*
     * Laporan harian. Jangkauan data ditentukan DailyReport::scopeVisibleTo();
     * tiap aksi tetap melewati DailyReportPolicy.
     */
    Route::get('/laporan', [DailyReportController::class, 'index'])->name('laporan.index');
    Route::post('/laporan', [DailyReportController::class, 'store'])->name('laporan.store');
    Route::get('/laporan/{laporan}', [DailyReportController::class, 'show'])->name('laporan.show');
    Route::put('/laporan/{laporan}', [DailyReportController::class, 'update'])->name('laporan.update');
    Route::delete('/laporan/{laporan}', [DailyReportController::class, 'destroy'])
        ->name('laporan.destroy');
    Route::post('/laporan/{laporan}/kirim', [DailyReportController::class, 'kirim'])
        ->name('laporan.kirim');
    Route::post('/laporan/{laporan}/tinjau', [DailyReportController::class, 'tinjau'])
        ->name('laporan.tinjau');

    /*
     * Export preview-first (standarisasi §27): tidak ada unduhan langsung.
     * Pratinjau dan berkas memakai satu sumber data yang sama, sehingga isi
     * berkas tidak pernah berbeda dari yang sudah dilihat.
     *
     * Jangkauannya tetap DailyReport::scopeVisibleTo() — export tidak boleh
     * menjadi jalan memutar untuk membaca laporan di luar jangkauan.
     */
    Route::get('/export/pratinjau', [ExportController::class, 'pratinjau'])
        ->name('export.pratinjau');
    Route::get('/export/excel', [ExportController::class, 'excel'])->name('export.excel');
    Route::get('/export/pdf', [ExportController::class, 'pdf'])->name('export.pdf');
});
