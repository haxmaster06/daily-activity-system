<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto profil pengguna.
 *
 * Yang disimpan hanya **jalurnya**, bukan berkasnya. Menyimpan gambar sebagai
 * blob di basis data membuat tiap dump membengkak berkali lipat, dan cadangan
 * harian yang dijadwalkan `dams:backup` ikut membesar tanpa alasan.
 *
 * Jalurnya menunjuk cakram `local` — di luar direktori publik. Foto orang bukan
 * berkas yang boleh diambil siapa pun yang menebak alamatnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('avatar_path', 191)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('avatar_path');
        });
    }
};
