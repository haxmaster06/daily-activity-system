<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\File;

/**
 * Penjaga perintah backup dan uji restore.
 *
 * Yang diuji di sini **bukan** apakah mysqldump bekerja — itu diperiksa dengan
 * menjalankannya sungguhan. Yang diuji adalah penolakannya: perintah yang salah
 * sasaran dapat menimpa database project lain di server yang sama, dan itu
 * kesalahan yang tidak dapat diperbaiki setelah terjadi (ADR-008).
 */
it('menolak backup bila koneksi tidak menunjuk dams_db', function (): void {
    config(['database.connections.'.config('database.default').'.database' => 'database_lain']);

    // Nama database yang salah wajib disebut; pesan selebihnya dipatah-patah
    // pemformat konsol sehingga tidak dapat dicocokkan utuh.
    $this->artisan('dams:backup')
        ->expectsOutputToContain('database_lain')
        ->assertFailed();
});

it('menolak backup bila folder tujuannya belum diatur', function (): void {
    config([
        'database.connections.'.config('database.default').'.database' => 'dams_db',
        'dams.backup.folder' => '',
    ]);

    $this->artisan('dams:backup')
        ->expectsOutputToContain('DAMS_BACKUP_FOLDER')
        ->assertFailed();
});

/*
 * Uji restore menjatuhkan database sasarannya. Menjalankannya dari lingkungan
 * yang koneksinya sudah menunjuk `dams_db_testing` berarti menjatuhkan database
 * yang sedang dipakai — termasuk saat rangkaian test ini sendiri berjalan.
 */
it('menolak uji restore bila koneksi sudah menunjuk database sasaran', function (): void {
    config([
        'database.connections.'.config('database.default').'.database' => 'dams_db_testing',
    ]);

    $this->artisan('dams:uji-restore', ['--paksa' => true])
        ->expectsOutputToContain('dams_db_testing')
        ->assertFailed();
});

it('menolak uji restore bila tidak ada berkas backup', function (): void {
    $kosong = storage_path('framework/testing/backup-kosong');
    File::ensureDirectoryExists($kosong);
    File::cleanDirectory($kosong);

    config([
        'database.connections.'.config('database.default').'.database' => 'dams_db',
        'dams.backup.folder' => $kosong,
    ]);

    $this->artisan('dams:uji-restore', ['--paksa' => true])
        ->expectsOutputToContain('dams:backup')
        ->assertFailed();

    File::deleteDirectory($kosong);
});

it('menolak berkas backup yang ditunjuk tetapi tidak ada', function (): void {
    config(['database.connections.'.config('database.default').'.database' => 'dams_db']);

    $this->artisan('dams:uji-restore', [
        '--paksa' => true,
        '--berkas' => storage_path('tidak-ada.sql'),
    ])
        ->expectsOutputToContain('tidak ditemukan')
        ->assertFailed();
});

it('mendaftarkan backup dan uji restore pada penjadwal', function (): void {
    $terjadwal = collect(app(Schedule::class)->events())
        ->map(fn ($acara) => $acara->command ?? '')
        ->implode(' | ');

    /*
     * Sampai sebelum ini, `schedule:work` berjalan tanpa satu tugas pun
     * terdaftar — tab penjadwal pada JALANKAN_DAMS.bat menganggur. Test ini
     * menahan keadaan itu supaya tidak kembali diam-diam.
     */
    expect($terjadwal)->toContain('dams:backup')
        ->and($terjadwal)->toContain('dams:uji-restore');
});
