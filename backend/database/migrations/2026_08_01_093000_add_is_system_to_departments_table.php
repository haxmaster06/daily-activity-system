<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Departemen sistem.
 *
 * Administrator awal tidak termasuk unit kerja mana pun — menempatkannya di
 * Document Control, misalnya, membuat ia terhitung sebagai anggota departemen
 * itu pada monitoring dan rekap. Ia diberi departemen tersendiri yang tidak
 * dapat dipilih untuk akun lain dan tidak muncul sebagai pilihan di mana pun.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->boolean('is_system')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table): void {
            $table->dropColumn('is_system');
        });
    }
};
