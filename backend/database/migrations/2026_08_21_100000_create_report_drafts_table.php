<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Draf isian laporan yang tersimpan otomatis di latar.
 *
 * Cermin server dari draf localStorage (frontend/src/lib/draf-laporan.ts): satu
 * baris per pengguna per "kunci" (`baru` atau `ubah-<id>`), menyimpan payload
 * form apa adanya. Sengaja TERPISAH dari `daily_reports` — jalur laporan resmi
 * memvalidasi tiap sel (kolom wajib, tipe), jadi form setengah-jadi tak bisa
 * disimpan di sana. Draf ini tak divalidasi isinya; ia cuma jaring pemulihan,
 * dibaca kembali hanya oleh pemiliknya ke formnya sendiri.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_drafts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kunci', 40);
            $table->json('payload');
            $table->timestamps();

            $table->unique(['user_id', 'kunci']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_drafts');
    }
};
