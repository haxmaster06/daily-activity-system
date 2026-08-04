<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mengikat kolom template ke daftar master.
 *
 * Menggantikan `lookup_source` — string bebas berisi salah satu dari lima kunci
 * mati yang tidak pernah dibaca siapa pun. Kolomnya **tidak dihapus di rilis
 * ini**: penghapusan kolom dua tahap (ADR-008), berhenti dipakai dulu, drop
 * pada rilis berikutnya.
 *
 * `master_induk_key` menunjuk kunci kolom **pada template yang sama** yang
 * pilihannya menyaring daftar kolom ini. Kolom LOT menunjuk kolom Supplier,
 * sehingga memilih supplier menyempitkan daftar LOT (§1.2). Disimpan sebagai
 * kunci kolom, bukan kunci asing: kolom template ditulis ulang setiap kali
 * templatenya disimpan, sehingga id-nya tidak bertahan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            /*
             * Restrict: jenis daftar yang masih dipakai kolom template tidak
             * boleh hilang begitu saja — kolomnya akan kehilangan sumber
             * pilihannya tanpa ada yang memberi tahu.
             */
            $table->foreignId('master_type_id')
                ->nullable()
                ->after('lookup_source')
                ->constrained('master_types')
                ->restrictOnDelete();

            $table->string('master_induk_key', 64)->nullable()->after('master_type_id');
        });
    }

    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->dropForeign(['master_type_id']);
            $table->dropColumn(['master_type_id', 'master_induk_key']);
        });
    }
};
