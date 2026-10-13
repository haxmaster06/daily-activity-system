<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menghapus tabel papan progres, yang fiturnya sudah dicabut seluruhnya.
 *
 * ⚠️ **MENGHAPUS DATA DAN TIDAK DAPAT DIBATALKAN.** `down()` di bawah
 * membangun kembali strukturnya, bukan isinya. Kartu yang pernah dicatat hanya
 * dapat pulih dari backup.
 *
 * Karena itu sebelum menjalankannya di production, tiga langkah ini wajib
 * berurutan — bukan anjuran:
 *
 * ```
 * php artisan dams:backup        # ambil dump
 * php artisan dams:uji-restore   # buktikan dump-nya benar-benar pulih
 * php artisan migrate            # baru menjatuhkan tabelnya
 * ```
 *
 * ADR-008 meminta penghapusan tabel dilakukan dua tahap: berhenti memakai di
 * satu rilis, menjatuhkan di rilis berikutnya. Pemilik project memilih
 * sekaligus, sadar datanya hilang. Catatan ini merekam bahwa itu keputusan,
 * bukan kelalaian.
 *
 * Urutan drop mengikuti arah foreign key: pivot lebih dulu, sebab
 * `tugas_laporan.tugas_id` menunjuk `tugas`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('tugas_laporan');
        Schema::dropIfExists('tugas');
    }

    /**
     * Membangun ulang struktur kedua tabel, tanpa isinya.
     *
     * Bentuknya adalah bentuk TERAKHIR sebelum dijatuhkan — sudah termasuk
     * `description` yang dilebarkan menjadi `text` dan index
     * `tugas_target_selesai_status_index` yang ditambahkan menyusul. Membangun
     * ulang bentuk aslinya akan membuat migration setelahnya tidak cocok lagi.
     */
    public function down(): void
    {
        Schema::create('tugas', function (Blueprint $table): void {
            $table->id();

            $table->string('title', 150);
            $table->text('description')->nullable();

            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();

            $table->foreignId('penanggung_jawab_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('status', 24)->default('belum_mulai');
            $table->string('prioritas', 16)->nullable();
            $table->date('target_selesai')->nullable();
            $table->unsignedSmallInteger('urutan')->default(0);

            $table->foreignId('dibuat_oleh_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['department_id', 'status', 'urutan']);
            $table->index(['penanggung_jawab_id', 'status']);
            $table->index(['target_selesai', 'status'], 'tugas_target_selesai_status_index');
        });

        Schema::create('tugas_laporan', function (Blueprint $table): void {
            $table->foreignId('tugas_id')->constrained('tugas')->cascadeOnDelete();
            $table->foreignId('daily_report_id')->constrained('daily_reports')->cascadeOnDelete();

            $table->primary(['tugas_id', 'daily_report_id']);
            $table->index('daily_report_id');
        });
    }
};
