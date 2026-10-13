<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Setelan aplikasi berbentuk key-value.
 *
 * Dipakai pertama oleh Mode Pemeliharaan; bentuk generik supaya setelan lain
 * (yang bukan konfigurasi environment) menumpang di sini tanpa tabel baru.
 * Nilainya JSON agar satu kunci dapat menyimpan objek — `{aktif, pesan, ...}`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table): void {
            $table->string('key', 64)->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
