<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penanda akun sistem.
 *
 * Akun administrator awal yang dibuat seeder tidak boleh dapat dihapus: ia
 * satu-satunya jalan masuk ketika tidak ada akun lain yang tersisa, dan
 * memulihkannya hanya mungkin lewat konsol di server.
 *
 * Ditandai kolom, bukan dicocokkan dengan `DAMS_ADMIN_EMAIL` saat berjalan.
 * Alamat di env dapat berubah, dan begitu berubah akun yang tadinya
 * terlindungi mendadak dapat dihapus tanpa ada yang menyadarinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_system')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('is_system');
        });
    }
};
