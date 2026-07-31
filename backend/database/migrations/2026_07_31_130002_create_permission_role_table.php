<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Izin yang melekat pada sebuah peran.
 *
 * Tanpa timestamps: riwayat siapa mengubah apa sudah ditangani `audit_logs`,
 * dan menyimpannya dua kali membuat keduanya bisa berbeda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permission_role', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();

            // Kunci gabungan sekaligus menjamin satu izin tidak tercatat dua kali.
            $table->primary(['role_id', 'permission_id']);

            // Arah balik: "siapa saja yang boleh meninjau laporan" dipakai
            // pemberitahuan laporan masuk dan penjaga akun pengelola terakhir.
            $table->index('permission_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_role');
    }
};
