<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index untuk kartu yang melewati target selesai.
 *
 * Ditemukan lewat EXPLAIN, bukan dugaan. Executive Analytics menjalankan
 * penyaringan ini pada tiap pemuatan halaman:
 *
 *   WHERE target_selesai < ? AND status <> 'selesai' ORDER BY target_selesai
 *
 * dan sebelum migration ini hasilnya `type=ALL` — seluruh tabel dibaca, lalu
 * diurutkan dengan filesort. Belum terasa pada data pengembangan, dan akan
 * terasa begitu papan progres dipakai seluruh departemen selama beberapa bulan.
 *
 * Urutan kolomnya sengaja `target_selesai` lebih dulu: itu kolom yang disaring
 * sebagai rentang sekaligus dipakai mengurutkan, sehingga index yang sama
 * menutup keduanya. `status` menyusul untuk menyaring sisanya tanpa membaca
 * baris.
 *
 * Additive, dan `down()` benar-benar mengembalikan keadaan semula (ADR-008).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tugas', function (Blueprint $table): void {
            $table->index(['target_selesai', 'status'], 'tugas_target_selesai_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('tugas', function (Blueprint $table): void {
            $table->dropIndex('tugas_target_selesai_status_index');
        });
    }
};
