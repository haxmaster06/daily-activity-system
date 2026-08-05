<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Memulihkan backup terakhir ke `dams_db_testing`, lalu memeriksanya.
 *
 * **Backup yang tidak pernah diuji pulih bukanlah backup.** Berkas dump dapat
 * terpotong, kehilangan satu tabel, atau tersimpan dengan sandi yang salah, dan
 * ketiganya baru ketahuan pada hari data aslinya sudah hilang. Perintah ini
 * membuktikannya sekarang, di database yang memang boleh ditimpa.
 *
 * ⚠️ **Menimpa isi `dams_db_testing` sepenuhnya.** Database itu memang database
 * test yang tabelnya dijatuhkan tiap rangkaian test berjalan, tetapi perintah
 * ini tetap menolak berjalan pada nama database lain, apa pun konfigurasinya —
 * server yang dipakai berisi banyak database project lain (ADR-008).
 */
class UjiRestore extends Command
{
    protected $signature = 'dams:uji-restore
        {--berkas= : Berkas backup tertentu; bila kosong, dipakai yang terbaru}
        {--paksa : Jalan tanpa bertanya, untuk penjadwal}';

    protected $description = 'Memulihkan backup terakhir ke dams_db_testing lalu memeriksa isinya';

    /** Satu-satunya database yang boleh ditimpa perintah ini. */
    private const DATABASE_SASARAN = 'dams_db_testing';

    public function handle(): int
    {
        if (app()->isProduction() && ! $this->option('paksa')) {
            $this->components->error(
                'Di produksi, jalankan dengan --paksa dan pastikan '
                .self::DATABASE_SASARAN.' memang boleh ditimpa.',
            );

            return self::FAILURE;
        }

        $berkas = $this->berkasBackup();

        if ($berkas === null) {
            return self::FAILURE;
        }

        $konfigurasi = config('database.connections.'.config('database.default'));

        if (($konfigurasi['database'] ?? null) === self::DATABASE_SASARAN) {
            /*
             * Menolak menimpa database yang sedang dipakai aplikasi, sekalipun
             * namanya kebetulan cocok. Uji restore harus dijalankan dari
             * lingkungan yang menunjuk database kerja, bukan dari lingkungan
             * test.
             */
            $this->components->error(
                'Koneksi aktif sudah menunjuk '.self::DATABASE_SASARAN
                .'. Jalankan perintah ini dari lingkungan yang menunjuk database kerja.',
            );

            return self::FAILURE;
        }

        if (! $this->option('paksa') && ! $this->confirm(
            'Seluruh isi '.self::DATABASE_SASARAN.' akan ditimpa oleh '
            .basename($berkas).'. Lanjutkan?',
        )) {
            $this->components->info('Dibatalkan.');

            return self::SUCCESS;
        }

        $this->components->task('Menyiapkan '.self::DATABASE_SASARAN, function () use ($konfigurasi): bool {
            $this->siapkanSasaran($konfigurasi);

            return true;
        });

        $this->components->task('Memulihkan '.basename($berkas), function () use ($konfigurasi, $berkas): bool {
            $this->pulihkan($konfigurasi, $berkas);

            return true;
        });

        return $this->periksaHasil($konfigurasi);
    }

    private function berkasBackup(): ?string
    {
        $pilihan = $this->option('berkas');

        if (is_string($pilihan) && $pilihan !== '') {
            if (! is_file($pilihan)) {
                $this->components->error("Berkas tidak ditemukan: {$pilihan}");

                return null;
            }

            return $pilihan;
        }

        $folder = rtrim((string) config('dams.backup.folder'), '/\\');
        $berkas = $folder === '' ? [] : (glob($folder.DIRECTORY_SEPARATOR.'dams_db_*.sql') ?: []);

        if ($berkas === []) {
            $this->components->error(
                'Tidak ada berkas backup di '.($folder ?: '(folder belum diatur)')
                .'. Jalankan dams:backup lebih dulu.',
            );

            return null;
        }

        rsort($berkas);

        return $berkas[0];
    }

    /**
     * @param  array<string, mixed>  $konfigurasi
     */
    private function siapkanSasaran(array $konfigurasi): void
    {
        /*
         * Nama database ditulis langsung dari konstanta, tidak pernah dari
         * konfigurasi atau argumen. Itu yang membuat perintah ini mustahil
         * diarahkan ke database project lain, bahkan oleh berkas .env yang
         * salah.
         */
        $sasaran = self::DATABASE_SASARAN;

        DB::statement("DROP DATABASE IF EXISTS `{$sasaran}`");
        DB::statement("CREATE DATABASE `{$sasaran}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    /**
     * @param  array<string, mixed>  $konfigurasi
     */
    private function pulihkan(array $konfigurasi, string $berkas): void
    {
        $perintah = [
            config('dams.backup.mysql', 'mysql'),
            '--host='.$konfigurasi['host'],
            '--port='.$konfigurasi['port'],
            '--user='.$konfigurasi['username'],
            // Dump dibuat dengan --databases sehingga memuat `USE dams_db`.
            // Nama itu diganti saat dibaca; lihat `tanpaNamaDatabase()`.
            self::DATABASE_SASARAN,
        ];

        $proses = new Process($perintah, timeout: 900);
        $proses->setEnv(['MYSQL_PWD' => (string) $konfigurasi['password']]);
        $proses->setInput($this->tanpaNamaDatabase($berkas));
        $proses->run();

        if (! $proses->isSuccessful()) {
            throw new RuntimeException('Restore gagal: '.trim($proses->getErrorOutput()));
        }
    }

    /**
     * Membuang perintah yang memaksa dump kembali ke database asalnya.
     *
     * `mysqldump --databases` menyisipkan `CREATE DATABASE` dan `USE dams_db`.
     * Tanpa dibuang, uji restore justru akan menimpa database kerja — persis
     * kebalikan dari yang hendak dicapai perintah ini.
     *
     * @return resource
     */
    private function tanpaNamaDatabase(string $berkas)
    {
        $sumber = fopen($berkas, 'rb');

        if ($sumber === false) {
            throw new RuntimeException("Tidak dapat membaca {$berkas}");
        }

        $bersih = fopen('php://temp', 'w+b');

        if ($bersih === false) {
            fclose($sumber);

            throw new RuntimeException('Tidak dapat menyiapkan berkas sementara.');
        }

        while (($baris = fgets($sumber)) !== false) {
            $awal = ltrim($baris);

            if (
                stripos($awal, 'CREATE DATABASE') === 0
                || stripos($awal, 'USE `') === 0
            ) {
                continue;
            }

            fwrite($bersih, $baris);
        }

        fclose($sumber);
        rewind($bersih);

        return $bersih;
    }

    /**
     * @param  array<string, mixed>  $konfigurasi
     */
    private function periksaHasil(array $konfigurasi): int
    {
        $sasaran = self::DATABASE_SASARAN;

        $tabelAsli = collect(DB::select('SHOW TABLES'))
            ->map(fn ($baris) => array_values((array) $baris)[0])
            ->sort()
            ->values();

        $tabelPulih = collect(DB::select("SHOW TABLES FROM `{$sasaran}`"))
            ->map(fn ($baris) => array_values((array) $baris)[0])
            ->sort()
            ->values();

        $kurang = $tabelAsli->diff($tabelPulih);

        if ($kurang->isNotEmpty()) {
            $this->components->error('Tabel berikut tidak ikut pulih: '.$kurang->implode(', '));

            return self::FAILURE;
        }

        /*
         * Jumlah baris dibandingkan pada tabel yang paling berharga. Struktur
         * yang pulih tanpa isi tetap terlihat berhasil bila hanya nama tabel
         * yang diperiksa.
         */
        $penting = ['users', 'daily_reports', 'daily_report_items', 'report_templates'];
        $gagal = false;

        foreach ($penting as $tabel) {
            if (! $tabelAsli->contains($tabel)) {
                continue;
            }

            $asli = DB::table($tabel)->count();
            $pulih = (int) DB::selectOne("SELECT COUNT(*) AS jumlah FROM `{$sasaran}`.`{$tabel}`")->jumlah;

            $this->components->twoColumnDetail(
                $tabel,
                $asli === $pulih ? "{$pulih} baris ✓" : "{$pulih} dari {$asli} baris ✗",
            );

            if ($asli !== $pulih) {
                $gagal = true;
            }
        }

        if ($gagal) {
            $this->components->error('Jumlah baris hasil restore tidak sama dengan aslinya.');

            return self::FAILURE;
        }

        $this->components->info(sprintf(
            'Uji restore berhasil: %d tabel pulih lengkap ke %s.',
            $tabelPulih->count(),
            $sasaran,
        ));

        return self::SUCCESS;
    }
}
