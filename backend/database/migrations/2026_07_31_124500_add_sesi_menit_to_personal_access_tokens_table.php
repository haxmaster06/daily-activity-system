<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Panjang jendela sesi milik tiap token.
 *
 * Masa berlaku digeser terus selama aplikasi dipakai, sehingga jaraknya ke
 * `created_at` tidak lagi mencerminkan panjang jendelanya — menurunkannya dari
 * sana membuat sesi memanjang sendiri setiap kali diperpanjang. Panjangnya
 * disimpan sekali saat masuk dan tidak pernah berubah setelahnya.
 *
 * Nilainya nullable: token yang dibuat di luar alur masuk tidak diperpanjang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table): void {
            $table->unsignedInteger('sesi_menit')->nullable()->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table): void {
            $table->dropColumn('sesi_menit');
        });
    }
};
