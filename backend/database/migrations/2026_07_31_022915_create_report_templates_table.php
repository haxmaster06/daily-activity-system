<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Template laporan per departemen.
 *
 * Bentuk tabel tiap departemen berbeda-beda (lihat
 * `docs/template-departemen.md`), sehingga kolomnya disimpan sebagai data,
 * bukan sebagai kolom tabel. Menambah template baru cukup lewat antarmuka —
 * tanpa migration, tanpa fresh migrate (ADR-008).
 *
 * `department_id` boleh NULL untuk template yang dipakai lintas departemen,
 * mis. AKTIVITAS_UMUM.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->cascadeOnDelete();

            $table->string('code', 48)->unique();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();

            // Template yang dipakai lebih dulu saat membuat laporan baru.
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            /*
             * Template yang sudah dipakai laporan tidak boleh berubah bentuk,
             * karena laporan lama akan kehilangan makna kolomnya. Perubahan
             * pada template terkunci menghasilkan versi baru.
             */
            $table->unsignedSmallInteger('version')->default(1);
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('report_templates')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['department_id', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_templates');
    }
};
