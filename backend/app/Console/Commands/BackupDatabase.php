<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Membuat backup `dams_db` sebagai berkas `.sql`.
 *
 * ADR-008 melarang `migrate:fresh` dan kawan-kawannya, dan mewajibkan backup
 * sebelum `migrate` di lingkungan mana pun selain database lokal sekali pakai.
 * Larangan tanpa perintah backup yang benar-benar ada hanya menggeser
 * tanggung jawab; perintah inilah pasangannya.
 *
 * ⚠️ **Hanya membaca.** Perintah ini tidak pernah menulis satu baris pun ke
 * database. Pasangannya, `dams:uji-restore`, yang memulihkan — dan itu pun
 * hanya ke `dams_db_testing`.
 *
 * Server MySQL yang dipakai berisi banyak database project lain. Perintah ini
 * menolak berjalan bila koneksi aktif tidak menunjuk `dams_db`.
 */
class BackupDatabase extends Command
{
    protected $signature = 'dams:backup
        {--simpan-berapa=14 : Jumlah backup terakhir yang dipertahankan}
        {--tanpa-pangkas : Tidak menghapus backup lama}';

    protected $description = 'Membuat backup database dams_db beserta pemangkasan berkas lama';

    /** Database yang boleh dibackup. Selain ini, perintah berhenti. */
    private const DATABASE_DIIZINKAN = 'dams_db';

    public function handle(): int
    {
        $koneksi = config('database.default');
        $konfigurasi = config("database.connections.{$koneksi}");

        if (($konfigurasi['database'] ?? null) !== self::DATABASE_DIIZINKAN) {
            $this->components->error(sprintf(
                'Koneksi aktif menunjuk database [%s]. Backup hanya boleh dijalankan pada [%s]. '
                .'Server ini berisi database project lain.',
                $konfigurasi['database'] ?? '(kosong)',
                self::DATABASE_DIIZINKAN,
            ));

            return self::FAILURE;
        }

        $folder = rtrim((string) config('dams.backup.folder'), '/\\');

        if ($folder === '') {
            $this->components->error(
                'Folder backup belum diatur. Isi DAMS_BACKUP_FOLDER pada berkas .env.',
            );

            return self::FAILURE;
        }

        if (! is_dir($folder) && ! mkdir($folder, 0o750, true) && ! is_dir($folder)) {
            $this->components->error("Folder backup tidak dapat dibuat: {$folder}");

            return self::FAILURE;
        }

        $berkas = $folder.DIRECTORY_SEPARATOR.'dams_db_'.now()->format('Ymd_His').'.sql';

        $this->components->task("Menulis {$berkas}", function () use ($konfigurasi, $berkas): bool {
            $this->jalankanDump($konfigurasi, $berkas);

            return true;
        });

        $ukuran = filesize($berkas) ?: 0;

        /*
         * Dump kosong adalah kegagalan yang paling berbahaya: berkasnya ada,
         * penjadwalnya melaporkan sukses, dan barulah ketahuan saat dipulihkan.
         */
        if ($ukuran < 1024) {
            @unlink($berkas);
            $this->components->error('Hasil dump terlalu kecil untuk masuk akal. Berkas dibuang.');

            return self::FAILURE;
        }

        if (! $this->memuatSeluruhTabel($berkas)) {
            @unlink($berkas);
            $this->components->error(
                'Hasil dump tidak memuat seluruh tabel yang ada di database. Berkas dibuang.',
            );

            return self::FAILURE;
        }

        $this->components->info(sprintf(
            'Backup selesai: %s (%s).',
            basename($berkas),
            $this->ukuranTerbaca($ukuran),
        ));

        if (! $this->option('tanpa-pangkas')) {
            $this->pangkas($folder, max(1, (int) $this->option('simpan-berapa')));
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $konfigurasi
     */
    private function jalankanDump(array $konfigurasi, string $berkas): void
    {
        $perintah = [
            config('dams.backup.mysqldump', 'mysqldump'),
            '--host='.$konfigurasi['host'],
            '--port='.$konfigurasi['port'],
            '--user='.$konfigurasi['username'],
            /*
             * Transaksi tunggal supaya dumpnya konsisten tanpa mengunci tabel.
             * Tanpa ini, backup pada jam kerja memblokir penyimpanan laporan.
             */
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            // Baris CREATE DATABASE sengaja tidak disertakan: berkas ini tidak
            // boleh dapat memulihkan dirinya ke database bernama lain.
            '--no-create-db',
            '--databases',
            $konfigurasi['database'],
        ];

        $proses = new Process($perintah, timeout: 600);

        // Kata sandi lewat lingkungan, bukan argumen: argumen proses terbaca
        // pengguna lain di server yang sama.
        $proses->setEnv(['MYSQL_PWD' => (string) $konfigurasi['password']]);

        $keluaran = fopen($berkas, 'wb');

        if ($keluaran === false) {
            throw new RuntimeException("Tidak dapat menulis {$berkas}");
        }

        try {
            $proses->run(function (string $jenis, string $isi) use ($keluaran): void {
                if ($jenis === Process::OUT) {
                    fwrite($keluaran, $isi);
                }
            });
        } finally {
            fclose($keluaran);
        }

        if (! $proses->isSuccessful()) {
            @unlink($berkas);

            throw new RuntimeException('mysqldump gagal: '.trim($proses->getErrorOutput()));
        }
    }

    /**
     * Memastikan tiap tabel yang ada di database benar-benar ikut terbawa.
     *
     * Dump yang kehilangan satu tabel tetap terlihat seperti backup yang sah —
     * ukurannya wajar, perintahnya sukses — dan kehilangannya baru ketahuan
     * saat dipulihkan, yaitu saat datanya sudah tidak ada di tempat lain.
     */
    private function memuatSeluruhTabel(string $berkas): bool
    {
        $isi = file_get_contents($berkas);

        if ($isi === false) {
            return false;
        }

        foreach (DB::select('SHOW TABLES') as $baris) {
            $nama = array_values((array) $baris)[0] ?? null;

            if ($nama !== null && ! str_contains($isi, "CREATE TABLE `{$nama}`")) {
                $this->components->warn("Tabel {$nama} tidak ditemukan di dalam dump.");

                return false;
            }
        }

        return true;
    }

    private function pangkas(string $folder, int $simpan): void
    {
        $berkas = glob($folder.DIRECTORY_SEPARATOR.'dams_db_*.sql') ?: [];

        // Nama berkas memuat stempel waktu Ymd_His, sehingga urutan namanya
        // sama dengan urutan waktunya.
        rsort($berkas);

        foreach (array_slice($berkas, $simpan) as $lama) {
            @unlink($lama);
            $this->components->twoColumnDetail(basename($lama), 'dihapus');
        }
    }

    private function ukuranTerbaca(int $bita): string
    {
        if ($bita >= 1_048_576) {
            return round($bita / 1_048_576, 1).' MB';
        }

        return round($bita / 1024).' KB';
    }
}
