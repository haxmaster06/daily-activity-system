<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom tambahan agar peran dapat dikelola dari layar.
 *
 * `scope_level_default` HANYA untuk mengisi pilihan di layar saat penetapan
 * baru dibuat. Kode otorisasi tidak boleh membacanya: jangkauan yang berlaku
 * ada di `role_user.scope_level`, dan membaca dua sumber akan membuat dua
 * pengguna berperan sama memperoleh jawaban berbeda — cacat berbentuk
 * kebocoran data yang tidak terlihat saat review.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('description', 255)->nullable()->after('name');

            // Empat peran bawaan: slug tidak dapat diubah dan tidak dapat
            // dihapus. Tanpa penanda ini, administrator dapat menghapus peran
            // yang dipakai seeder dan penjaga akses.
            $table->boolean('is_system')->default(false)->after('level');

            $table->unsignedTinyInteger('scope_level_default')->nullable()->after('is_system');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn(['description', 'is_system', 'scope_level_default']);
        });
    }
};
