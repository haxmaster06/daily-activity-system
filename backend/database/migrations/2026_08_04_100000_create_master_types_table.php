<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jenis daftar master — Supplier, Customer, Produk, LOT, Satuan, dan apa pun
 * yang ditambahkan administrator kemudian.
 *
 * Dibuat generik, bukan satu tabel per entitas. Template laporan di DAMS memang
 * disusun administrator sendiri tanpa developer dan tanpa migration; daftar
 * pilihan yang dirujuk template harus mengikuti cara kerja yang sama. Tabel
 * khusus per entitas berarti setiap daftar baru menuntut migration dan rilis,
 * dan itu bertentangan dengan cara template dibuat.
 *
 * `parent_type_id` yang membuat penyempitan bertingkat mungkin: jenis LOT
 * berinduk jenis Supplier, sehingga memilih Supplier pada satu kolom
 * mempersempit pilihan LOT pada kolom berikutnya (docs/standar-ui-ux.md §1.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_types', function (Blueprint $table): void {
            $table->id();

            // Dibuat server dari nama, tidak pernah diketik pengguna (§1.3).
            $table->string('slug', 32)->unique();
            $table->string('name', 64);

            /*
             * Dibatasi restrict: jenis yang masih menjadi induk jenis lain
             * tidak boleh hilang, karena barisnya menjadi penyaring daftar
             * turunannya.
             */
            $table->foreignId('parent_type_id')
                ->nullable()
                ->constrained('master_types')
                ->restrictOnDelete();

            $table->string('description', 255)->nullable();

            // Jenis bawaan tidak dapat dihapus maupun diubah slug-nya.
            $table->boolean('is_system')->default(false);

            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['sort_order', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_types');
    }
};
