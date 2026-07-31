<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel notifikasi bawaan Laravel (channel `database`).
 *
 * Bentuknya sengaja tidak diubah supaya `Notifiable::notifications()`,
 * `unreadNotifications`, dan `markAsRead()` tetap dapat dipakai apa adanya.
 * Isi yang khas DAMS — judul, pesan, tautan — disimpan di kolom `data`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Lonceng menampilkan yang terbaru dan menghitung yang belum dibaca.
            $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'notifications_penerima_baca_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
