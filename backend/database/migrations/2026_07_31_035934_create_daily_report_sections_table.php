<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu bagian laporan, yaitu satu tabel yang dibentuk dari satu template.
 *
 * Satu laporan dapat memuat beberapa bagian sekaligus. QC, misalnya, mengisi
 * Pemeriksaan Lot, Kontrol Proses, dan Pengujian Bahan Baku pada hari yang
 * sama — pada berkas aslinya itu tiga tabel di satu lembar.
 *
 * `report_template_id` memakai restrictOnDelete: template yang sudah dipakai
 * laporan tidak boleh hilang begitu saja, karena kolomnya adalah satu-satunya
 * keterangan atas isi `daily_report_items.data`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_report_sections', function (Blueprint $table) {
            $table->id();

            $table->foreignId('daily_report_id')
                ->constrained('daily_reports')
                ->cascadeOnDelete();

            $table->foreignId('report_template_id')
                ->constrained('report_templates')
                ->restrictOnDelete();

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            // Satu template hanya boleh muncul sekali dalam satu laporan.
            $table->unique(['daily_report_id', 'report_template_id']);
            $table->index(['daily_report_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_sections');
    }
};
