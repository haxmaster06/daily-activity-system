<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Katalog hak akses.
 *
 * Isinya proyeksi dari `App\Support\KatalogIzin`, bukan data yang tumbuh dari
 * layar. Administrator hanya mencentang izin untuk sebuah peran; membuat izin
 * baru tidak ada gunanya selama tidak ada kode yang memeriksanya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table): void {
            $table->id();

            // Pengenal teknis, mis. "laporan.tinjau". Tidak pernah jadi label layar.
            $table->string('key', 64)->unique();

            // Pengelompokan untuk layar pengelolaan peran.
            $table->string('group_key', 32);

            // Label Bahasa Indonesia — inilah yang dibaca pengguna.
            $table->string('name', 96);
            $table->string('description', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['group_key', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
