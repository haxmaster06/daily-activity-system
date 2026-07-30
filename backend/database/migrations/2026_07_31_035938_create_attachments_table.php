<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lampiran laporan (PRD §9).
 *
 * `path` menyimpan lokasi di disk penyimpanan, tidak pernah dipakai langsung
 * sebagai URL. Unduhan selalu lewat controller agar izinnya diperiksa dulu —
 * tautan penyimpanan yang terbuka membuat siapa pun yang menebak nama berkas
 * dapat membacanya.
 *
 * `original_name` disimpan terpisah karena nama berkas dari pengguna tidak
 * dipakai di disk: nama itu dapat memuat karakter berbahaya dan dapat kembar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('daily_report_id')
                ->constrained('daily_reports')
                ->cascadeOnDelete();

            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();

            $table->string('original_name', 191);
            $table->string('path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');

            $table->timestamps();

            $table->index('daily_report_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
