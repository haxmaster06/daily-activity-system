<?php

use App\Support\PindahkanSumberMaster;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Memindahkan `lookup_source` ke `master_type_id`.
 *
 * Isinya di `App\Support\PindahkanSumberMaster` supaya dapat diuji. Aman
 * dijalankan berulang: hanya kolom yang belum punya `master_type_id` yang
 * disentuh.
 *
 * `lookup_source` tidak dihapus di sini — penghapusan kolom dua tahap
 * (ADR-008): berhenti dipakai dulu, drop pada rilis berikutnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        $hasil = PindahkanSumberMaster::jalankan();

        $pesan = "Kolom template terhubung ke daftar master: {$hasil['dipindahkan']}.";

        if ($hasil['dilewati'] > 0) {
            $pesan .= " {$hasil['dilewati']} kolom dilewati karena sumbernya belum punya ".
                'daftar master padanan. Kolom itu masih bertipe teks dan dapat ';
            $pesan .= 'dihubungkan lewat halaman Template Laporan.';
        }

        $pesan .= ' Tipe kolom sengaja tidak diubah — administrator yang memutuskan '.
            'kapan sebuah kolom berpindah menjadi pilihan dari daftar master.';

        Log::info($pesan);

        // Migration tidak punya akses ke output console; angka ini terlalu
        // penting untuk hanya mengendap di log saat dijalankan manual.
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            fwrite(STDOUT, $pesan.PHP_EOL);
        }
    }

    public function down(): void
    {
        // Yang dikembalikan persis bentuk yang dimasukkannya: hanya kolom yang
        // masih punya `lookup_source` sebagai asalnya.
        DB::table('template_fields')
            ->whereNotNull('lookup_source')
            ->update(['master_type_id' => null]);
    }
};
