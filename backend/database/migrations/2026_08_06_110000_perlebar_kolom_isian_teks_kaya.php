<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Melebarkan dua kolom yang kini menyimpan HTML, bukan lagi teks polos.
 *
 * Sejak keterangan tugas dan catatan tinjauan diisi lewat editor teks kaya,
 * yang tersimpan membawa tag pemformatannya sendiri. Satu daftar berpoin
 * berisi tiga butir sudah menghabiskan sekitar 50 karakter hanya untuk
 * `<ul><li></li></ul>` — jatah yang sebelumnya utuh untuk kalimat pengguna.
 *
 * Batas yang dirasakan pengguna tidak berubah: validasi menghitung panjang
 * teksnya setelah tag dilucuti (`App\Support\HtmlAman::keTeks`), sehingga
 * "maksimal 500 karakter" tetap berarti 500 karakter yang benar-benar diketik.
 * Kolomnya dilebarkan supaya tagnya punya tempat.
 *
 * Aditif: tidak ada kolom yang dihapus dan tidak ada data yang hilang, sebab
 * TEXT menampung seluruh isi varchar sebelumnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_reports', function (Blueprint $table): void {
            $table->text('review_note')->nullable()->change();
        });

        Schema::table('tugas', function (Blueprint $table): void {
            $table->text('description')->nullable()->change();
        });
    }

    /**
     * ⚠️ Rollback ini dapat memangkas data.
     *
     * Isi yang sudah melampaui batas lama akan terpotong MySQL saat kolomnya
     * dikembalikan — dan pada mode ketat, migrationnya berhenti dengan galat
     * alih-alih memotong diam-diam, yang justru lebih baik. Backup dulu
     * sebelum menjalankannya, sebagaimana berlaku untuk tiap rollback di
     * project ini (ADR-008).
     */
    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table): void {
            $table->string('review_note', 255)->nullable()->change();
        });

        Schema::table('tugas', function (Blueprint $table): void {
            $table->string('description', 500)->nullable()->change();
        });
    }
};
