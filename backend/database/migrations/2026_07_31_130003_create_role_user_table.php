<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penetapan peran kepada pengguna, beserta jangkauan datanya.
 *
 * Jangkauan melekat di sini, bukan di perannya: seseorang dapat menjadi
 * Supervisor untuk Produksi sekaligus Staff di QC, dan kedua hal itu tidak
 * dapat dinyatakan bila jangkauannya milik peran.
 *
 * ARTI `department_id` BERBEDA PER TINGKAT:
 *
 *   - Tingkat 1 (Pribadi)    : wajib kosong. Departemen di sini akan menjadi
 *                              sumber kebenaran kedua di samping
 *                              `users.department_id`.
 *   - Tingkat 2 (Departemen) : kosong berarti "mengikuti departemen pengguna",
 *                              dibaca dari `users.department_id` saat query.
 *   - Tingkat 3 (Korporat)   : wajib kosong.
 *
 * Aturan itu ditegakkan Form Request dan `User::syncRoles()`, BUKAN oleh basis
 * data. CHECK constraint sengaja tidak dipakai: MySQL di bawah 8.0.16
 * menerimanya lalu mengabaikannya diam-diam, sehingga memberi rasa aman palsu.
 *
 * Catatan indeks unik: MySQL menganggap NULL berbeda satu sama lain, jadi
 * kombinasi dengan `department_id` kosong tetap dapat masuk dua kali. Yang
 * mencegahnya adalah `syncRoles()`, bukan indeks ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_user', function (Blueprint $table): void {
            // Kunci pengganti diperlukan: layar harus dapat menunjuk satu
            // penetapan untuk dihapus, sementara kunci alaminya memuat kolom
            // yang boleh kosong.
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Peran yang masih dipakai tidak boleh hilang begitu saja; layar
            // menolaknya dengan pesan yang menghitung jumlah pemakainya.
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();

            $table->unsignedTinyInteger('scope_level')->default(1);

            $table->foreignId('department_id')->nullable()
                ->constrained('departments')->restrictOnDelete();

            // Menjawab "sejak kapan wewenang ini diberikan".
            $table->timestamps();

            $table->unique(
                ['user_id', 'role_id', 'scope_level', 'department_id'],
                'role_user_penetapan_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_user');
    }
};
