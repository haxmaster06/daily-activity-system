<?php

use App\Support\BackfillPenetapanRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

/**
 * Memindahkan peran yang sudah ada ke tabel penetapan.
 *
 * Isinya berada di `App\Support\BackfillPenetapanRole` supaya dapat diuji.
 * Aman dijalankan berulang.
 */
return new class extends Migration
{
    public function up(): void
    {
        $hasil = BackfillPenetapanRole::jalankan();

        $pesan = "Penetapan peran terisi: {$hasil['diisi']}.";

        if ($hasil['tanpa_role'] > 0) {
            $pesan .= " PERHATIAN: {$hasil['tanpa_role']} akun tidak punya role, ".
                'sehingga tidak memperoleh penetapan apa pun dan kehilangan seluruh '.
                'akses. Tetapkan perannya lewat halaman Manajemen Pengguna.';
        }

        Log::info($pesan);

        // Migration tidak punya akses ke output console; angka ini terlalu
        // penting untuk hanya mengendap di log saat dijalankan manual.
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            fwrite(STDOUT, $pesan.PHP_EOL);
        }
    }

    public function down(): void
    {
        BackfillPenetapanRole::balikkan();
    }
};
