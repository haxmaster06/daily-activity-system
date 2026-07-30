<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Definisi kolom pada satu template laporan.
 *
 * `key` adalah penanda kolom di dalam data laporan (`daily_report_items.data`).
 * Unik per template, tidak pernah berubah setelah dipakai, dan tidak pernah
 * ditampilkan ke user — label yang dilihat user ada di `label`
 * (standarisasi §26, nama kolom database tidak boleh bocor ke layar).
 *
 * `group_label` merender header tabel dua baris, mengikuti bentuk lembar kerja
 * asli — mis. Produksi mengelompokkan kolom di bawah Oven, Ayak, Packing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_fields', function (Blueprint $table) {
            $table->id();

            $table->foreignId('report_template_id')
                ->constrained('report_templates')
                ->cascadeOnDelete();

            $table->string('key', 64);
            $table->string('label', 100);
            $table->string('group_label', 64)->nullable();

            // text, textarea, integer, decimal, date, month, select, boolean
            $table->string('type', 16);

            $table->boolean('is_required')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->string('unit', 16)->nullable();       // kg, pcs, box, %
            $table->string('placeholder', 100)->nullable();
            $table->string('help_text', 255)->nullable();

            /*
             * Pilihan untuk type `select`. Data bermaster wajib memakai select
             * atau autocomplete — bukan ketik bebas (standar interaksi §1.1).
             */
            $table->json('options')->nullable();

            /*
             * Sumber master data eksternal untuk autocomplete, mis. `supplier`
             * atau `lot`. Bila diisi, kolom mengambil pilihannya dari endpoint
             * master data, bukan dari `options`.
             */
            $table->string('lookup_source', 32)->nullable();

            /*
             * Rumus kolom hitungan, mis. `qty_masuk - qty_keluar`. Kolom yang
             * punya rumus terkunci di antarmuka dan ditandai "dihitung
             * otomatis" (standar interaksi §1.2).
             */
            $table->string('computed_from', 191)->nullable();

            $table->decimal('min_value', 15, 3)->nullable();
            $table->decimal('max_value', 15, 3)->nullable();

            $table->timestamps();

            $table->unique(['report_template_id', 'key']);
            $table->index(['report_template_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_fields');
    }
};
