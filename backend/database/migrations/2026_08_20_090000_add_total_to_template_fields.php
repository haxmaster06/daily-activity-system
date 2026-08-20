<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penanda "tampilkan baris total" per kolom angka.
 *
 * Kolom yang ditandai menampilkan jumlah ke bawah (SUM seluruh baris) di baris
 * Total pada grid, tampilan laporan, dan export — seperti SUM kolom di Excel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->boolean('total')->default(false)->after('beku');
        });
    }

    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->dropColumn('total');
        });
    }
};
