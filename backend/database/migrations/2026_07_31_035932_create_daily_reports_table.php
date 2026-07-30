<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Header laporan harian (PRD §9).
 *
 * Satu pengguna hanya punya satu laporan per tanggal — itu arti "daily
 * report". Bentuknya dijamin unique index, bukan sekadar pemeriksaan di
 * aplikasi, agar dua permintaan yang datang bersamaan tidak menghasilkan
 * laporan kembar.
 *
 * `department_id` disalin dari pengguna saat laporan dibuat, tidak dibaca
 * ulang lewat relasi. Pengguna dapat dipindah departemen, dan laporan lama
 * harus tetap tercatat di departemen tempatnya dikerjakan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();

            $table->date('report_date');

            // draf | dikirim | ditinjau
            $table->string('status', 16)->default('draf');

            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_note', 255)->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'report_date']);
            $table->index(['department_id', 'report_date']);
            $table->index(['status', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
