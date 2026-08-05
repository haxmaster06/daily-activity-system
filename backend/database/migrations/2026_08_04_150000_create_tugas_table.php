<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tugas — kartu pada papan progres harian.
 *
 * Berdiri sendiri, bukan turunan baris laporan. Pekerjaan nyata berlangsung
 * lintas hari: satu audit berjalan seminggu, satu kalibrasi tiga hari. Baris
 * laporan terikat pada satu tanggal, sehingga memakainya sebagai kartu menuntut
 * pengisi membuat ulang kartu yang sama tiap pagi.
 *
 * `status` memakai kosakata yang **sama persis** dengan
 * `daily_report_items.progress_status`. Itu disengaja: Executive Analytics
 * menghitung keduanya berdampingan, dan dua istilah untuk hal yang sama akan
 * membuatnya diam-diam menghitung dua hal berbeda sebagai satu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas', function (Blueprint $table): void {
            $table->id();

            $table->string('title', 150);
            $table->string('description', 500)->nullable();

            /*
             * Departemen menentukan siapa yang melihatnya — jangkauan data
             * dibaca dari sini, bukan dari penanggung jawabnya. Tugas yang
             * belum berpenanggung jawab tetap terlihat oleh departemennya.
             */
            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();

            $table->foreignId('penanggung_jawab_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('status', 24)->default('belum_mulai');
            $table->string('prioritas', 16)->nullable();
            $table->date('target_selesai')->nullable();

            // Posisi kartu di dalam kolomnya. Urutan pada papan punya arti bagi
            // pengisinya — yang paling atas dikerjakan lebih dulu.
            $table->unsignedSmallInteger('urutan')->default(0);

            $table->foreignId('dibuat_oleh_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['department_id', 'status', 'urutan']);
            $table->index(['penanggung_jawab_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tugas');
    }
};
