<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom yang tetap terlihat saat tabel isian digulir mendatar.
 *
 * Template dengan belasan kolom memaksa pengisi menggulir kanan kiri, dan
 * begitu kolom identitasnya lewat dari layar tidak ada lagi penanda baris mana
 * yang sedang diisi. Kolom beku menyelesaikan itu tanpa menghilangkan
 * kepadatan yang justru membuat entri cepat.
 *
 * Dibatasi dua kolom pertama saat dirender: lebih dari itu memakan lebar yang
 * justru hendak diselamatkan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->boolean('beku')->default(false)->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->dropColumn('beku');
        });
    }
};
