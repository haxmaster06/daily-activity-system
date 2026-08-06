<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Support\BackfillPenetapanRole;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Mengisi daftar pengguna dari berkas rujukan basis data.
 *
 * ---------------------------------------------------------------------------
 * MENGAPA DATANYA DIBACA, BUKAN DITULIS DI SINI
 * ---------------------------------------------------------------------------
 *
 * Berkas rujukan memuat nama karyawan, alamat email kerja, dan hash kata sandi
 * mereka. Repository ini publik. Menyalin isinya ke dalam seeder berarti
 * menerbitkan nama orang beserta hash yang dapat dipecahkan luring — dan
 * larangannya tertulis di CLAUDE.md: isi data klien tidak pernah masuk ke kode,
 * komentar, seeder, test, maupun pesan commit.
 *
 * Karena itu berkas ini hanya memuat cara membacanya. Datanya tetap berada di
 * berkas `.sql` yang sudah diabaikan git, dan tidak pernah ikut ter-commit
 * maupun ikut masuk ke dalam image Docker — `docker/backend.Dockerfile` hanya
 * menyalin direktori `backend/`.
 *
 * ---------------------------------------------------------------------------
 * TIDAK IKUT `db:seed`
 * ---------------------------------------------------------------------------
 *
 * Seeder ini sengaja tidak didaftarkan di DatabaseSeeder. `php artisan db:seed`
 * harus tetap berhasil di mesin mana pun, termasuk yang tidak punya berkas
 * rujukannya. Jalankan sendiri:
 *
 *     docker compose run --rm \
 *       -v "$PWD/data_db_reference:/referensi:ro" \
 *       -e DAMS_REFERENSI_PENGGUNA="/referensi/DAMS_DB(Data_Users).sql" \
 *       backend php artisan db:seed --force \
 *       --class='Database\Seeders\PenggunaSeeder'
 *
 * Idempotent: dijalankan berulang tidak menggandakan siapa pun, dan tidak
 * pernah mengembalikan kata sandi pengguna yang sudah ada.
 */
class PenggunaSeeder extends Seeder
{
    /**
     * Akun yang tidak diimpor, dibaca dari environment.
     *
     * Bukan dipatok di kode. Alamat mana yang perlu dilewati bergantung pada
     * keadaan deployment — administrator bawaan yang sudah dibuat
     * `AdministratorSeeder`, atau alamat yang sudah dipakai akun lain sehingga
     * bentrok dengan kolom email yang unik. Semuanya berubah per pemasangan,
     * dan tidak satu pun berlaku umum.
     *
     * Menuliskannya di sini juga berarti menerbitkan alamat email milik
     * perusahaan ke repositori yang publik — hal yang tidak perlu dan tidak
     * dapat ditarik kembali.
     *
     * Diisi lewat `DAMS_PENGGUNA_DILEWATI`, dipisah koma. Contoh:
     *
     *     DAMS_PENGGUNA_DILEWATI="admin@contoh.test,orang@contoh.test"
     *
     * @return list<string>
     */
    private function dilewati(): array
    {
        return collect(explode(',', (string) env('DAMS_PENGGUNA_DILEWATI', '')))
            ->map(fn (string $satu) => mb_strtolower(trim($satu)))
            ->filter()
            ->values()
            ->all();
    }


    /**
     * Departemen DB sumber yang tidak ada di antara departemen milik sistem ini.
     *
     * ID 1..18 tidak perlu dipetakan: sembilan baris tercocokkan sempurna
     * antara alamat email dan nama departemen pada ID yang sama, sehingga tabel
     * departemen kedua sistem identik pada rentang itu. Yang berbeda hanya
     * departemen yang ditambahkan belakangan lewat aplikasi.
     *
     * Kunci = ID di DB sumber, nilai = `departments.code` di sini.
     */
    private const PETA_DEPARTEMEN_TAMBAHAN = [
        // 21 => 'KODE_DEPARTEMEN_BARU',
    ];

    /** ID departemen tertinggi yang dijamin sama antara kedua sistem. */
    private const BATAS_ID_SEPADAN = 18;

    public function run(): void
    {
        $baris = $this->bacaBerkasRujukan();
        $dilewatiSengaja = $this->dilewati();

        $dibuat = 0;
        $sudahAda = 0;
        $dilewati = 0;
        $tertahan = [];

        foreach ($baris as $data) {
            $email = $data['email'];

            if (in_array(mb_strtolower($email), $dilewatiSengaja, true)) {
                $dilewati++;

                continue;
            }

            // Akun sistem DB sumber tidak pernah diimpor, apa pun alamatnya.
            if ((int) ($data['is_system'] ?? 0) === 1) {
                $dilewati++;

                continue;
            }

            $departmentId = $this->departemenUntuk((int) $data['department_id']);

            if ($departmentId === null) {
                // Ditahan, bukan diisi seadanya. `DailyReport::scopeVisibleTo()`
                // menyaring data berdasarkan departemen — menebak di sini
                // berarti seseorang melihat laporan yang bukan haknya.
                $tertahan[] = $email.' (departemen '.$data['department_id'].' di DB sumber)';

                continue;
            }

            $baruDibuat = ! User::where('email', $email)->exists();

            $pengguna = User::firstOrNew(['email' => $email]);
            $pengguna->name = $data['name'];
            $pengguna->department_id = $departmentId;
            $pengguna->role_id = (int) $data['role_id'];
            $pengguna->is_active = (bool) $data['is_active'];

            /*
             * Hash dibawa apa adanya supaya pengguna tetap masuk dengan kata
             * sandi yang sudah mereka pakai. Cast `hashed` pada model
             * meneruskan nilai yang sudah ter-hash tanpa meng-hash ulang.
             *
             * Hanya saat akun dibuat: menjalankan ulang seeder tidak boleh
             * mengembalikan kata sandi lama seseorang yang sudah menggantinya.
             */
            if ($baruDibuat) {
                $pengguna->password = $data['password'];
            }

            $pengguna->save();

            $baruDibuat ? $dibuat++ : $sudahAda++;
        }

        // Penetapan peran diturunkan dari `role_id` oleh helper yang sama
        // dipakai migration backfill, supaya aturan jangkauannya satu sumber.
        BackfillPenetapanRole::jalankan();

        $this->command?->info("Pengguna dibuat: {$dibuat}, sudah ada: {$sudahAda}, dilewati: {$dilewati}.");

        if ($tertahan !== []) {
            $this->command?->warn(
                'Tertahan karena departemennya belum ada di sistem ini — '
                .'tambahkan departemennya lalu daftarkan di PETA_DEPARTEMEN_TAMBAHAN:',
            );

            foreach ($tertahan as $satu) {
                $this->command?->warn('  - '.$satu);
            }
        }
    }

    /**
     * Menerjemahkan ID departemen DB sumber menjadi ID di sistem ini.
     *
     * Mengembalikan null bila tidak dapat ditentukan — pemanggilnya menahan
     * baris itu alih-alih menebak.
     */
    private function departemenUntuk(int $idSumber): ?int
    {
        if ($idSumber <= self::BATAS_ID_SEPADAN) {
            return Department::whereKey($idSumber)->value('id');
        }

        $kode = self::PETA_DEPARTEMEN_TAMBAHAN[$idSumber] ?? null;

        if ($kode === null) {
            return null;
        }

        return Department::where('code', $kode)->value('id');
    }

    /**
     * Membaca baris `users` dari berkas dump.
     *
     * @return array<int, array<string, string|null>>
     */
    private function bacaBerkasRujukan(): array
    {
        $jalur = env(
            'DAMS_REFERENSI_PENGGUNA',
            base_path('../data_db_reference/DAMS_DB(Data_Users).sql'),
        );

        if (! is_string($jalur) || ! is_readable($jalur)) {
            throw new RuntimeException(
                'Berkas rujukan pengguna tidak terbaca. Setel DAMS_REFERENSI_PENGGUNA '
                .'ke jalur berkas dump, dan pastikan berkasnya ter-mount bila dijalankan '
                .'di dalam container.',
            );
        }

        $isi = file_get_contents($jalur);

        if ($isi === false || ! preg_match(
            '/insert\s+into\s+`?users`?\s*\(([^)]+)\)\s*values\s*(.+?);/is',
            $isi,
            $cocok,
        )) {
            throw new RuntimeException(
                'Tidak menemukan satu pun pernyataan INSERT untuk tabel `users` di '.$jalur.'.',
            );
        }

        $kolom = array_map(
            static fn (string $nama): string => trim($nama, " \t\n\r`"),
            explode(',', $cocok[1]),
        );

        $baris = [];

        foreach ($this->pisahkanTuple($cocok[2]) as $tuple) {
            $nilai = $this->pisahkanNilai($tuple);

            if (count($nilai) !== count($kolom)) {
                throw new RuntimeException(
                    'Jumlah nilai tidak sama dengan jumlah kolom pada salah satu baris berkas rujukan.',
                );
            }

            $baris[] = array_combine($kolom, $nilai);
        }

        return $baris;
    }

    /**
     * Memecah bagian VALUES menjadi tiap tuple `( ... )`.
     *
     * Tanda kurung di dalam string dihormati — hash bcrypt dan nama dapat
     * memuatnya.
     *
     * @return array<int, string>
     */
    private function pisahkanTuple(string $values): array
    {
        $tuple = [];
        $sekarang = '';
        $kedalaman = 0;
        $dalamKutip = false;
        $panjang = strlen($values);

        for ($i = 0; $i < $panjang; $i++) {
            $huruf = $values[$i];

            if ($dalamKutip) {
                if ($huruf === '\\' && $i + 1 < $panjang) {
                    $sekarang .= $huruf.$values[++$i];

                    continue;
                }

                if ($huruf === "'") {
                    $dalamKutip = false;
                }

                $sekarang .= $huruf;

                continue;
            }

            if ($huruf === "'") {
                $dalamKutip = true;
                $sekarang .= $huruf;

                continue;
            }

            if ($huruf === '(') {
                $kedalaman++;

                if ($kedalaman === 1) {
                    $sekarang = '';

                    continue;
                }
            }

            if ($huruf === ')') {
                $kedalaman--;

                if ($kedalaman === 0) {
                    $tuple[] = $sekarang;

                    continue;
                }
            }

            if ($kedalaman > 0) {
                $sekarang .= $huruf;
            }
        }

        return $tuple;
    }

    /**
     * Memecah satu tuple menjadi nilai-nilainya.
     *
     * `NULL` menjadi null; string dilepas kutipnya beserta escape-nya.
     *
     * @return array<int, string|null>
     */
    private function pisahkanNilai(string $tuple): array
    {
        $nilai = [];
        $sekarang = '';
        $dalamKutip = false;
        $panjang = strlen($tuple);

        for ($i = 0; $i < $panjang; $i++) {
            $huruf = $tuple[$i];

            if ($dalamKutip) {
                if ($huruf === '\\' && $i + 1 < $panjang) {
                    $sekarang .= $tuple[++$i];

                    continue;
                }

                if ($huruf === "'") {
                    // Dua kutip berurutan berarti satu kutip di dalam string.
                    if ($i + 1 < $panjang && $tuple[$i + 1] === "'") {
                        $sekarang .= "'";
                        $i++;

                        continue;
                    }

                    $dalamKutip = false;

                    continue;
                }

                $sekarang .= $huruf;

                continue;
            }

            if ($huruf === "'") {
                $dalamKutip = true;

                continue;
            }

            if ($huruf === ',') {
                $nilai[] = $this->rapikan($sekarang);
                $sekarang = '';

                continue;
            }

            $sekarang .= $huruf;
        }

        $nilai[] = $this->rapikan($sekarang);

        return $nilai;
    }

    private function rapikan(string $mentah): ?string
    {
        $bersih = trim($mentah);

        return strcasecmp($bersih, 'NULL') === 0 ? null : $bersih;
    }
}
