<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Penjadwalan
|--------------------------------------------------------------------------
|
| Dijalankan `php artisan schedule:work` — tab keempat pada JALANKAN_DAMS.bat.
| Sampai sebelum ini, tab itu berjalan tanpa satu tugas pun terdaftar.
|
*/

/*
 * Backup harian, di jam paling sepi.
 *
 * ADR-008 melarang seluruh perintah yang menjatuhkan data, dan mewajibkan
 * backup sebelum `migrate`. Backup yang hanya dijalankan saat teringat bukan
 * perlindungan — yang menyelamatkan adalah backup semalam sebelum kejadiannya.
 *
 * `withoutOverlapping` menjaga backup yang belum selesai tidak ditimpa jalannya
 * berikutnya; database yang sudah besar dapat memakan lebih dari satu jam.
 */
Schedule::command('dams:backup', ['--simpan-berapa='.config('dams.backup.simpan', 14)])
    ->dailyAt('01:00')
    ->withoutOverlapping(120)
    ->runInBackground();

/*
 * Uji restore mingguan.
 *
 * Backup yang tidak pernah diuji pulih bukanlah backup. Dump yang terpotong,
 * kehilangan satu tabel, atau tersimpan dengan sandi yang salah semuanya
 * terlihat seperti berkas yang sah — dan ketiganya baru ketahuan pada hari data
 * aslinya sudah hilang.
 *
 * Sasarannya `dams_db_testing`, satu-satunya database selain `dams_db` yang
 * boleh disentuh. Perintahnya menolak berjalan pada nama database lain.
 */
Schedule::command('dams:uji-restore', ['--paksa'])
    ->weeklyOn(0, '02:30')
    ->withoutOverlapping(120)
    ->runInBackground();
