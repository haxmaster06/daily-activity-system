<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Isi tiap daftar master.
 *
 * `parent_id` menunjuk baris pada jenis induk — satu baris LOT menunjuk satu
 * baris Supplier. Yang menjaga bahwa induknya benar-benar berjenis
 * `master_types.parent_type_id` adalah Form Request, **bukan** CHECK
 * constraint: MySQL di bawah 8.0.16 mengabaikan CHECK diam-diam, sehingga
 * aturan yang ditulis di sana hanya terlihat seperti dijaga.
 *
 * Nilai yang tersimpan di laporan **bukan** kunci asing ke tabel ini,
 * melainkan salinan `{kode, nama}` di dalam `daily_report_items.data`. Laporan
 * adalah arsip; menghapus satu baris master tidak boleh mengubah isi laporan
 * tahun lalu. Pola yang sama sudah dipakai `daily_reports.department_id` yang
 * disalin saat laporan dibuat, dan `audit_logs.user_name`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_data', function (Blueprint $table): void {
            $table->id();

            // Jenisnya hilang berarti isinya ikut hilang — tidak ada arti
            // tersendiri bagi baris tanpa daftar.
            $table->foreignId('master_type_id')->constrained('master_types')->cascadeOnDelete();

            // Dibuat server dari nama (§1.3).
            $table->string('code', 48);
            $table->string('name', 150);

            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('master_data')
                ->restrictOnDelete();

            $table->string('description', 255)->nullable();

            /*
             * Atribut tambahan yang berbeda tiap jenis — alamat supplier,
             * tanggal terima LOT — tanpa menuntut migration baru. Sengaja tidak
             * dipakai untuk apa pun yang perlu disaring atau diindeks.
             */
            $table->json('data')->nullable();

            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['master_type_id', 'code']);
            $table->index(['master_type_id', 'is_active', 'sort_order']);
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_data');
    }
};
