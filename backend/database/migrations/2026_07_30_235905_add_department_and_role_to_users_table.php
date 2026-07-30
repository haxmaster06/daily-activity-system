<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan departemen, role, dan status pada tabel users (PRD §9).
 *
 * Migration terpisah, bukan menyunting berkas pembuat tabel users, karena
 * migration tersebut sudah pernah dijalankan. Perubahan skema selalu additive —
 * lihat docs/adr/ADR-008-larangan-fresh-migrate.md.
 *
 * `department_id` dan `role_id` dibuat nullable agar penambahan kolom tidak
 * gagal pada tabel yang sudah berisi baris. Pengisiannya dijamin lapisan
 * aplikasi: pembuatan user mewajibkan keduanya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')
                ->nullable()
                ->after('password')
                ->constrained('departments')
                ->restrictOnDelete();

            $table->foreignId('role_id')
                ->nullable()
                ->after('department_id')
                ->constrained('roles')
                ->restrictOnDelete();

            // Nonaktifkan user tanpa menghapus, agar riwayat laporannya utuh.
            $table->boolean('is_active')->default(true)->after('role_id');

            $table->timestamp('last_login_at')->nullable()->after('is_active');

            $table->index(['department_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['department_id', 'is_active']);
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('role_id');
            $table->dropColumn(['is_active', 'last_login_at']);
        });
    }
};
