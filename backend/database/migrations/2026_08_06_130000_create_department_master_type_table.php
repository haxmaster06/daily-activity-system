<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Departemen yang berwenang mengelola isi sebuah jenis master.
 *
 * Yang mengenal isinya adalah unit kerja yang memakainya sehari-hari: daftar
 * Supplier dipegang Purchasing, daftar Produk dipegang Produksi, daftar
 * Customer dipegang Produksi bersama Marketing. Izin `master.kelola` yang
 * berlaku menyeluruh membuat siapa pun yang memegangnya dapat menyunting
 * daftar yang tidak ia kenal — dan daftar master yang salah tidak berhenti di
 * satu layar, sebab seluruh laporan yang memilih dari sana ikut membawanya.
 *
 * ## Banyak-ke-banyak, bukan satu pemilik
 *
 * Satu jenis dapat dipegang lebih dari satu departemen. Customer adalah
 * contohnya, dan memaksakan satu pemilik akan langsung meleset pada kasus
 * pertama.
 *
 * ## Kosong berarti terbuka
 *
 * Jenis yang belum ditetapkan departemen pengelolanya tetap dapat dikelola
 * siapa pun yang memegang `master.kelola`, persis seperti sebelum tabel ini
 * ada. Dengan begitu migration ini tidak mencabut akses siapa pun pada saat
 * dijalankan; pembatasan baru berlaku pada jenis yang memang sengaja diatur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_master_type', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('master_type_id')->constrained('master_types')->cascadeOnDelete();

            $table->timestamps();

            // Satu departemen tidak dapat tercatat dua kali pada jenis yang sama.
            $table->unique(['department_id', 'master_type_id'], 'dept_master_type_unik');

            // Pertanyaan yang paling sering diajukan: departemen mana saja yang
            // mengelola jenis ini.
            $table->index('master_type_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_master_type');
    }
};
