<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu baris isian pada sebuah bagian laporan.
 *
 * Nilainya disimpan pada `data` sebagai JSON, berkunci
 * `template_fields.key`. Bentuk tabel tiap departemen berbeda-beda, sehingga
 * kolomnya tidak dapat ditetapkan di skema.
 *
 * `progress_status` sengaja didenormalisasi keluar dari `data`. Monitoring
 * menyaring laporan berdasarkan status, dan menyaring di dalam JSON tidak
 * dapat memakai index. Nilainya diisi server dari kolom template bertipe
 * pilihan yang berkunci `status`; template yang tidak punya kolom itu
 * membiarkannya NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_report_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('daily_report_section_id')
                ->constrained('daily_report_sections')
                ->cascadeOnDelete();

            $table->json('data');

            // belum_mulai | dalam_proses | selesai — atau NULL
            $table->string('progress_status', 24)->nullable();

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['daily_report_section_id', 'sort_order']);
            $table->index('progress_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_items');
    }
};
