<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak audit aktivitas penting (non-fungsional §11).
 *
 * Bersifat append-only: tidak ada `updated_at`, dan tidak ada jalur di
 * aplikasi yang mengubah maupun menghapus baris di sini.
 *
 * `user_id` memakai nullOnDelete agar baris audit tetap ada walau akun
 * pelakunya suatu saat dihapus — nama pelaku disimpan terpisah pada
 * `user_name`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name', 100)->nullable();

            $table->string('action', 32);   // dibuat | diperbarui | dinonaktifkan | ...
            $table->string('module', 32);   // pengguna | departemen | laporan | ...
            $table->string('auditable_type', 191)->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->string('description', 255);

            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['module', 'created_at']);
            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
