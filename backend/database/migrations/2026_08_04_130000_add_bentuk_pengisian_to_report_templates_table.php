<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bentuk pengisian bawaan sebuah template.
 *
 * `grid` — tabel padat, cepat untuk memasukkan banyak baris sekaligus.
 * `baris` — satu baris dibuka sebagai form vertikal, tanpa gulir mendatar sama
 * sekali. Cocok untuk template berkolom banyak yang barisnya sedikit.
 *
 * Hanya menentukan bawaan; pengisi tetap dapat menukarnya kapan saja.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_templates', function (Blueprint $table): void {
            $table->string('bentuk_pengisian', 16)->default('grid')->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table): void {
            $table->dropColumn('bentuk_pengisian');
        });
    }
};
