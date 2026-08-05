<?php

use App\Http\Controllers\AnalitikController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ImportLaporanController;
use App\Http\Controllers\ImportMasterController;
use App\Http\Controllers\LampiranController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\MasterTypeController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PengingatController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportTemplateController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TugasController;
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

Route::middleware(['auth:sanctum', 'aktif', 'perpanjang-sesi', 'throttle:api'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me'])->name('me');

    /*
     * Ringkasan. Angkanya dibatasi DailyReport::scopeVisibleTo() — pengguna
     * tidak boleh melihat angka yang mencakup laporan di luar jangkauannya.
     * Monitoring menolak Staff sejak di controller.
     */
    Route::get('/dashboard', DashboardController::class)
        ->middleware('izin:dashboard.lihat')
        ->name('dashboard');
    Route::get('/monitoring', MonitoringController::class)
        ->middleware('izin:monitoring.lihat')
        ->name('monitoring');

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
        ->middleware(['izin:monitoring.kirim-pengingat', 'throttle:pengingat'])
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

    /*
     * Papan progres harian. Kartunya berumur lintas hari, sehingga tidak
     * berpagination — papan yang menyembunyikan sebagian kartunya berhenti
     * menjadi papan. Jangkauan datanya dijaga `Tugas::scopeVisibleTo()`.
     */
    Route::get('/tugas', [TugasController::class, 'index'])->name('tugas.index');
    Route::post('/tugas', [TugasController::class, 'store'])->name('tugas.store');
    Route::put('/tugas/{tugas}', [TugasController::class, 'update'])->name('tugas.update');
    Route::patch('/tugas/{tugas}/geser', [TugasController::class, 'geser'])->name('tugas.geser');
    Route::delete('/tugas/{tugas}', [TugasController::class, 'destroy'])->name('tugas.destroy');

    /*
     * Executive Analytics. Seluruh angkanya dikirim sekaligus — yang membukanya
     * membaca satu halaman, bukan menunggu enam permintaan.
     *
     * Izinnya terpisah dari monitoring: yang dibaca di sini melintasi seluruh
     * jangkauan pemegangnya sekaligus, bukan satu tim.
     */
    Route::middleware('izin:analitik.lihat')->prefix('analitik')->group(function (): void {
        Route::get('/opsi', [AnalitikController::class, 'opsi'])->name('analitik.opsi');
        Route::get('/ringkasan', [AnalitikController::class, 'ringkasan'])->name('analitik.ringkasan');
        Route::get('/kepatuhan', [AnalitikController::class, 'kepatuhan'])->name('analitik.kepatuhan');
        Route::get('/produktivitas', [AnalitikController::class, 'produktivitas'])
            ->name('analitik.produktivitas');
        Route::get('/progres', [AnalitikController::class, 'progres'])->name('analitik.progres');
    });

    /*
     * Daftar master generik — Supplier, Produk, Satuan, dan apa pun yang
     * ditambahkan administrator.
     *
     * `/master/jenis` harus mendahului `/master/{jenis}`, kalau tidak kata
     * "jenis" ditangkap sebagai slug daftar dan permintaannya berakhir 404 —
     * cacat yang sama sudah pernah terjadi pada `/role/matriks`.
     *
     * Slug dipakai sebagai pengikat rute, bukan id, supaya alamatnya terbaca
     * dan tetap sah walau datanya dipindahkan antar lingkungan.
     */
    Route::get('/master/jenis', [MasterTypeController::class, 'index'])->name('master.jenis.index');
    Route::post('/master/jenis', [MasterTypeController::class, 'store'])->name('master.jenis.store');
    Route::put('/master/jenis/{jenis:slug}', [MasterTypeController::class, 'update'])
        ->name('master.jenis.update');
    Route::delete('/master/jenis/{jenis:slug}', [MasterTypeController::class, 'destroy'])
        ->name('master.jenis.destroy');

    /*
     * Unduh template dan import daftar master.
     *
     * Harus mendahului `/master/{jenis}` — pola `/master/{jenis}/…` sama
     * panjang, dan yang terdaftar lebih dulu yang menang. Cacat yang sama sudah
     * pernah terjadi pada `/role/matriks`.
     *
     * Preview-first, sama seperti export: `pratinjau` tidak menulis apa pun.
     */
    Route::get('/master/{jenis:slug}/template-import', [ImportMasterController::class, 'template'])
        ->name('master.template-import');
    Route::post('/master/{jenis:slug}/import/pratinjau', [ImportMasterController::class, 'pratinjau'])
        ->middleware('throttle:unggah')
        ->name('master.import.pratinjau');
    Route::post('/master/{jenis:slug}/import', [ImportMasterController::class, 'simpan'])
        ->middleware('throttle:unggah')
        ->name('master.import');

    // Juga harus mendahului `/master/{jenis}` karena polanya sama panjang.
    Route::get('/master/{jenis:slug}/cari', [MasterDataController::class, 'cari'])
        ->name('master.cari');
    Route::get('/master/{jenis:slug}', [MasterDataController::class, 'index'])->name('master.index');
    Route::post('/master/{jenis:slug}', [MasterDataController::class, 'store'])->name('master.store');
    Route::put('/master/{jenis:slug}/{item}', [MasterDataController::class, 'update'])
        ->name('master.update');
    Route::delete('/master/{jenis:slug}/{item}', [MasterDataController::class, 'destroy'])
        ->name('master.destroy');

    /*
     * Peran dan hak akses. Daftar peran memuat `{id, slug, nama}` seperti
     * sebelumnya, sehingga pemakai lama tetap terlayani.
     */
    Route::get('/role', [RoleController::class, 'index'])->name('role.index');
    Route::get('/izin', [RoleController::class, 'katalogIzin'])->name('izin.index');
    Route::post('/role', [RoleController::class, 'store'])->name('role.store');

    // Harus mendahului `/role/{role}`, kalau tidak "matriks" ditangkap sebagai
    // id peran dan permintaannya berakhir 404.
    Route::put('/role/matriks', [RoleController::class, 'simpanMatriks'])
        ->name('role.matriks');
    Route::put('/role/{role}', [RoleController::class, 'update'])->name('role.update');
    Route::delete('/role/{role}', [RoleController::class, 'destroy'])->name('role.destroy');
    Route::get('/pengguna', [UserController::class, 'index'])->name('pengguna.index');
    Route::post('/pengguna', [UserController::class, 'store'])->name('pengguna.store');
    Route::put('/pengguna/{user}', [UserController::class, 'update'])->name('pengguna.update');
    Route::put('/pengguna/{user}/penetapan', [UserController::class, 'aturPenetapan'])
        ->name('pengguna.penetapan');
    Route::put('/pengguna/{user}/status', [UserController::class, 'ubahStatus'])
        ->name('pengguna.status');
    Route::put('/pengguna/{user}/kata-sandi', [UserController::class, 'aturUlangKataSandi'])
        ->name('pengguna.kata-sandi');

    /*
     * Menghapus akun hanya untuk yang belum meninggalkan jejak. Akun yang sudah
     * punya laporan dinonaktifkan, bukan dihapus.
     */
    Route::delete('/pengguna/{user}', [UserController::class, 'destroy'])
        ->name('pengguna.destroy');

    /*
     * Import laporan harian. Bentuk kolomnya berbeda tiap template, sehingga
     * template berkasnya dibangkitkan per template laporan.
     *
     * Harus mendahului `/template/{template}` — pola turunannya sama panjang
     * dan yang terdaftar lebih dulu yang menang.
     */
    Route::get('/template/{template}/import/template', [ImportLaporanController::class, 'template'])
        ->name('laporan.import.template');
    Route::post('/template/{template}/import/pratinjau', [ImportLaporanController::class, 'pratinjau'])
        ->middleware('throttle:unggah')
        ->name('laporan.import.pratinjau');
    Route::post('/template/{template}/import', [ImportLaporanController::class, 'simpan'])
        ->middleware('throttle:unggah')
        ->name('laporan.import');

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
     * Lampiran. Izinnya mengikuti laporannya lewat AttachmentPolicy.
     *
     * Unduhan selalu melewati controller — tautan penyimpanan yang terbuka
     * membuat siapa pun yang menebak nama berkas dapat membacanya.
     */
    Route::post('/laporan/{laporan}/lampiran', [LampiranController::class, 'store'])
        ->middleware('throttle:unggah')
        ->name('lampiran.store');
    Route::get('/lampiran/{lampiran}', [LampiranController::class, 'show'])
        ->name('lampiran.show');
    Route::delete('/lampiran/{lampiran}', [LampiranController::class, 'destroy'])
        ->name('lampiran.destroy');

    /*
     * Export preview-first (standarisasi §27): tidak ada unduhan langsung.
     * Pratinjau dan berkas memakai satu sumber data yang sama, sehingga isi
     * berkas tidak pernah berbeda dari yang sudah dilihat.
     *
     * Jangkauannya tetap DailyReport::scopeVisibleTo() — export tidak boleh
     * menjadi jalan memutar untuk membaca laporan di luar jangkauan.
     */
    Route::middleware('izin:export.laporan')->group(function (): void {
        Route::get('/export/pratinjau', [ExportController::class, 'pratinjau'])
            ->name('export.pratinjau');
        Route::get('/export/excel', [ExportController::class, 'excel'])->name('export.excel');
        Route::get('/export/pdf', [ExportController::class, 'pdf'])->name('export.pdf');
    });
});
