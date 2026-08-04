<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Variasi tampilan sebuah kolom saat diisi.
 *
 * Satu tipe data dapat tampil dengan beberapa cara: Pilihan sebagai dropdown,
 * tombol berjajar, atau radio; Ya/Tidak sebagai centang atau sakelar; angka
 * biasa, berpersen, atau berupa rupiah.
 *
 * Persen dan rupiah sengaja **bukan** tipe tersendiri. Keduanya tetap angka
 * desimal; menjadikannya tipe akan menggandakan aturan validasi dan
 * representasi export tanpa menambah satu pun bentuk data baru.
 *
 * Null berarti tampilan bawaan tipe tersebut.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->string('tampilan', 24)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->dropColumn('tampilan');
        });
    }
};
