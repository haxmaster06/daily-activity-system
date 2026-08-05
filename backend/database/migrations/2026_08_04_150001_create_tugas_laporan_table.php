<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tautan tugas ke laporan harian yang menjadi buktinya.
 *
 * Menunjuk `daily_reports`, **bukan** `daily_report_items` — dan itu keputusan,
 * bukan penyederhanaan.
 *
 * `DailyReportController::update()` menjalankan `$laporan->sections()->delete()`
 * lalu membangun ulang seluruh isinya setiap kali laporan disunting. Alasannya
 * tertulis di sana: bentuk isian yang dinamis tidak menyediakan penanda baris
 * yang stabil. Akibatnya id baris laporan tidak bertahan melewati satu
 * penyuntingan, sehingga tautan ke baris akan putus diam-diam — tanpa galat,
 * tanpa ada yang menyadari. Id laporan bertahan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas_laporan', function (Blueprint $table): void {
            $table->foreignId('tugas_id')->constrained('tugas')->cascadeOnDelete();
            $table->foreignId('daily_report_id')->constrained('daily_reports')->cascadeOnDelete();

            $table->primary(['tugas_id', 'daily_report_id']);
            $table->index('daily_report_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tugas_laporan');
    }
};
