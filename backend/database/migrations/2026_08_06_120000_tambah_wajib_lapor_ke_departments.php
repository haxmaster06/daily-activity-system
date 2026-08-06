<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menandai departemen yang anggotanya tidak mengisi laporan harian.
 *
 * Tidak semua unit kerja menyusun laporan harian. Management membaca laporan,
 * bukan menulisnya — dan selama ia ikut terhitung, daftar "Belum Melapor Hari
 * Ini" memuat nama yang tidak akan pernah hilang dari sana. Peringatan yang
 * tidak dapat diselesaikan siapa pun lambat laun berhenti dibaca, dan yang ikut
 * berhenti dibaca adalah nama-nama yang memang perlu ditindaklanjuti.
 *
 * Berupa penanda pada departemen, bukan daftar nama di dalam kode: unit kerja
 * berubah, dan yang berikutnya harus dapat dikecualikan administrator sendiri
 * lewat layar Departemen — tanpa menunggu rilis.
 *
 * Aditif, dan bawaannya `true` sehingga seluruh departemen yang sudah ada tetap
 * berperilaku persis seperti sebelumnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->boolean('wajib_lapor')->default(true)->after('is_system');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->dropColumn('wajib_lapor');
        });
    }
};
