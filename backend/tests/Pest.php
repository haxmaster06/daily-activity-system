<?php

use Database\Seeders\IzinSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Feature test menyentuh database; Unit test tidak.
 *
 * Katalog izin diproyeksikan lebih dulu di tiap test. Isinya master data yang
 * berasal dari kode, bukan data yang dibuat pengguna — tanpa itu setiap
 * pemeriksaan `boleh()` bernilai false dan hampir seluruh rangkaian test gagal
 * karena alasan yang tidak ada hubungannya dengan apa yang diujinya.
 */
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => test()->seed(IzinSeeder::class))
    ->in('Feature');

pest()->extend(TestCase::class)->in('Unit');

/**
 * Melupakan hasil autentikasi permintaan sebelumnya.
 *
 * Guard Sanctum menyimpan user yang sudah berhasil di-resolve di dalam
 * instance guard, dan instance itu bertahan selama satu test. Akibatnya
 * permintaan kedua di test yang sama ikut dianggap terautentikasi meski
 * tokennya sudah dicabut — sehingga test bisa lulus padahal aplikasi
 * sebenarnya bocor, atau gagal padahal aplikasi benar.
 *
 * Panggil ini di antara dua permintaan bila permintaan kedua memang harus
 * memeriksa ulang token dari nol.
 */
function lupakanAutentikasi(): void
{
    app('auth')->forgetGuards();
}
