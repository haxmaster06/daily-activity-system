<?php

namespace App\Support;

use App\Models\Role;

/**
 * Katalog hak akses DAMS.
 *
 * Katalognya kode, bukan data. Tabel `permissions` adalah proyeksi berkas ini
 * lewat `IzinSeeder`, dan layar pengelolaan peran hanya boleh mencentang —
 * tidak membuat dan tidak menghapus. Baris izin yang tidak punya pemanggil
 * `boleh()` di kode adalah kebohongan kepada operator: dicentang, tetapi tidak
 * berpengaruh pada apa pun.
 *
 * Kunci izin adalah pengenal teknis dan tidak boleh muncul sebagai label layar
 * (CLAUDE.md, Aturan Bahasa). Yang ditampilkan adalah `nama`.
 */
final class KatalogIzin
{
    public const DASHBOARD_LIHAT = 'dashboard.lihat';

    public const LAPORAN_LIHAT = 'laporan.lihat';

    public const LAPORAN_BUAT = 'laporan.buat';

    public const LAPORAN_UBAH_SENDIRI = 'laporan.ubah-sendiri';

    public const LAPORAN_HAPUS_SENDIRI = 'laporan.hapus-sendiri';

    public const LAPORAN_KIRIM = 'laporan.kirim';

    public const LAPORAN_TINJAU = 'laporan.tinjau';

    public const EXPORT_LAPORAN = 'export.laporan';

    public const MONITORING_LIHAT = 'monitoring.lihat';

    public const MONITORING_KIRIM_PENGINGAT = 'monitoring.kirim-pengingat';

    public const TUGAS_LIHAT = 'tugas.lihat';

    public const TUGAS_KELOLA = 'tugas.kelola';

    public const ANALITIK_LIHAT = 'analitik.lihat';

    public const DEPARTEMEN_LIHAT = 'departemen.lihat';

    public const DEPARTEMEN_KELOLA = 'departemen.kelola';

    public const TEMPLATE_LIHAT = 'template.lihat';

    public const TEMPLATE_KELOLA = 'template.kelola';

    public const MASTER_LIHAT = 'master.lihat';

    public const MASTER_KELOLA = 'master.kelola';

    public const PENGGUNA_LIHAT = 'pengguna.lihat';

    public const PENGGUNA_KELOLA = 'pengguna.kelola';

    public const PENGGUNA_NONAKTIFKAN = 'pengguna.nonaktifkan';

    public const PENGGUNA_ATUR_KATA_SANDI = 'pengguna.atur-kata-sandi';

    public const ROLE_LIHAT = 'role.lihat';

    public const ROLE_KELOLA = 'role.kelola';

    /** Nama kelompok untuk pengelompokan di layar. */
    /**
     * Kelompok izin, berurut sesuai tampilnya di layar Manajemen Peran.
     *
     * Papan progres dan Executive Analytics berdiri sendiri, tidak menumpang
     * "Monitoring Tim". Keduanya fitur tersendiri dengan halamannya sendiri,
     * dan administrator yang mencari izinnya akan mencari nama fiturnya —
     * bukan menebak bahwa ia bersembunyi di bawah kelompok bernama lain.
     */
    public const GRUP = [
        'laporan' => 'Laporan Harian',
        'monitoring' => 'Monitoring Tim',
        'progres' => 'Papan Progres',
        'analitik' => 'Executive Analytics',
        'master' => 'Data Master',
        'pengguna' => 'Pengguna & Hak Akses',
    ];

    /**
     * Seluruh izin, berurut sesuai tampilnya di layar.
     *
     * @return list<array{key: string, group_key: string, name: string, description: string}>
     */
    public static function semua(): array
    {
        $daftar = [
            ['laporan', self::DASHBOARD_LIHAT, 'Membuka ringkasan', 'Melihat halaman ringkasan beserta angkanya.'],
            ['laporan', self::LAPORAN_LIHAT, 'Melihat laporan', 'Membuka daftar dan rincian laporan harian.'],
            ['laporan', self::LAPORAN_BUAT, 'Membuat laporan', 'Menyusun laporan harian baru.'],
            ['laporan', self::LAPORAN_UBAH_SENDIRI, 'Menyunting draf sendiri', 'Mengubah laporan sendiri selama masih berstatus draf.'],
            ['laporan', self::LAPORAN_HAPUS_SENDIRI, 'Menghapus draf sendiri', 'Menghapus laporan sendiri selama masih berstatus draf.'],
            ['laporan', self::LAPORAN_KIRIM, 'Mengirim laporan', 'Mengirim laporan sendiri sehingga menjadi catatan.'],
            ['laporan', self::LAPORAN_TINJAU, 'Meninjau laporan', 'Menandai laporan orang lain sudah ditinjau.'],
            ['laporan', self::EXPORT_LAPORAN, 'Mengexport laporan', 'Membuka pratinjau export dan mengunduh berkasnya.'],

            ['monitoring', self::MONITORING_LIHAT, 'Melihat kepatuhan tim', 'Membuka ringkasan siapa yang sudah dan belum melapor.'],
            ['monitoring', self::MONITORING_KIRIM_PENGINGAT, 'Mengirim pengingat', 'Mengingatkan anggota yang belum mengisi laporan.'],
            ['progres', self::TUGAS_LIHAT, 'Melihat papan progres', 'Membuka papan progres harian beserta kartunya.'],
            ['progres', self::TUGAS_KELOLA, 'Mengelola progres', 'Menambah, mengubah, memindahkan, dan menghapus kartu progres.'],

            ['analitik', self::ANALITIK_LIHAT, 'Membuka Executive Analytics', 'Melihat ringkasan visual progres dan kepatuhan seluruh jangkauan datanya.'],

            ['master', self::DEPARTEMEN_LIHAT, 'Melihat departemen', 'Membaca daftar departemen.'],
            ['master', self::DEPARTEMEN_KELOLA, 'Mengelola departemen', 'Menambah, mengubah, dan menghapus departemen.'],
            ['master', self::TEMPLATE_LIHAT, 'Melihat template', 'Membaca daftar template laporan.'],
            ['master', self::TEMPLATE_KELOLA, 'Mengelola template', 'Menambah, mengubah, dan menghapus template laporan.'],
            ['master', self::MASTER_LIHAT, 'Melihat daftar master', 'Membaca daftar pilihan seperti supplier, produk, dan satuan.'],
            ['master', self::MASTER_KELOLA, 'Mengelola isi daftar master', 'Mengisi daftar pilihan yang departemennya ditetapkan sebagai pengelola.'],

            ['pengguna', self::PENGGUNA_LIHAT, 'Melihat daftar pengguna', 'Membuka daftar akun beserta perannya.'],
            ['pengguna', self::PENGGUNA_KELOLA, 'Menambah & mengubah pengguna', 'Membuat akun baru dan mengubah datanya, termasuk penetapan peran.'],
            ['pengguna', self::PENGGUNA_NONAKTIFKAN, 'Menonaktifkan akun', 'Mengaktifkan dan menonaktifkan akun pengguna.'],
            ['pengguna', self::PENGGUNA_ATUR_KATA_SANDI, 'Mengatur ulang kata sandi', 'Menetapkan kata sandi baru untuk akun lain.'],
            ['pengguna', self::ROLE_LIHAT, 'Melihat peran', 'Membaca daftar peran beserta hak aksesnya.'],
            ['pengguna', self::ROLE_KELOLA, 'Mengelola peran & hak akses', 'Membuat peran, mengubah namanya, dan menentukan hak aksesnya.'],
        ];

        $hasil = [];

        foreach (array_values($daftar) as $urutan => [$grup, $kunci, $nama, $keterangan]) {
            $hasil[] = [
                'key' => $kunci,
                'group_key' => $grup,
                'name' => $nama,
                'description' => $keterangan,
                'sort_order' => $urutan,
            ];
        }

        return $hasil;
    }

    /**
     * @return list<string>
     */
    public static function kunci(): array
    {
        return array_column(self::semua(), 'key');
    }

    /**
     * Izin bawaan tiap peran sistem.
     *
     * Susunannya mereproduksi perilaku sebelum RBAC persis — itulah yang
     * membuat rangkaian test yang sudah ada menjadi jaring pengaman saat
     * otorisasi dialihkan.
     *
     * @return array<string, list<string>>
     */
    public static function bawaanPeran(): array
    {
        $staff = [
            self::DASHBOARD_LIHAT,
            self::LAPORAN_LIHAT,
            self::LAPORAN_BUAT,
            self::LAPORAN_UBAH_SENDIRI,
            self::LAPORAN_HAPUS_SENDIRI,
            self::LAPORAN_KIRIM,
            self::EXPORT_LAPORAN,
            self::DEPARTEMEN_LIHAT,
            self::TEMPLATE_LIHAT,
            // Diperlukan saat mengisi laporan: kolom yang mengambil pilihannya
            // dari daftar master tidak dapat dibuka tanpa membaca daftarnya.
            self::MASTER_LIHAT,
            /*
             * Mengelola ISI daftar master — dan hanya daftar yang departemennya
             * ditetapkan sebagai pengelola (MasterDataPolicy).
             *
             * Yang mengenal isi sebuah daftar adalah unit kerja yang memakainya
             * sehari-hari, bukan administrator. Tanpa izin ini di tangan mereka,
             * penetapan departemen pengelola tidak berarti apa-apa: satu-satunya
             * yang dapat mengelola justru pemegang jangkauan korporat, yang
             * batas departemennya memang tidak berlaku.
             *
             * Menyusun dan menghapus JENIS daftarnya tetap tertutup — itu
             * perubahan struktur, dan dijaga MasterTypePolicy.
             */
            self::MASTER_KELOLA,
            // Memasukkan progres harian memang pekerjaan staf.
            self::TUGAS_LIHAT,
            self::TUGAS_KELOLA,
        ];

        $supervisor = [
            ...$staff,
            self::LAPORAN_TINJAU,
            self::MONITORING_LIHAT,
            self::MONITORING_KIRIM_PENGINGAT,
        ];

        /*
         * Management: memantau, bukan menyusun.
         *
         * Executive Analytics dibuka di sini — halaman itu memang dibuat untuk
         * pembacanya, dan angkanya tetap dibatasi `scopeVisibleTo()` sehingga
         * jangkauan datanya tidak melebar sedikit pun.
         *
         * Mengelola kartu progres sengaja TIDAK diberikan. Karena itu daftarnya
         * ditulis dari `$staff`, bukan dari `$supervisor` — `IzinRoleSeeder`
         * memakai `syncWithoutDetaching`, jadi apa pun yang tercantum di sini
         * akan dipasang kembali tiap kali seeder berjalan, termasuk izin yang
         * sengaja dicabut operator lewat layar Manajemen Peran.
         */
        $management = array_values(array_diff(
            [...$staff, self::LAPORAN_TINJAU, self::MONITORING_LIHAT, self::MONITORING_KIRIM_PENGINGAT, self::ANALITIK_LIHAT],
            [self::TUGAS_KELOLA],
        ));

        return [
            Role::STAFF => self::urutKatalog($staff),
            Role::SUPERVISOR => self::urutKatalog($supervisor),
            Role::MANAGER => self::urutKatalog($management),
            Role::ADMINISTRATOR => self::kunci(),
        ];
    }

    /**
     * Mengurutkan sekumpulan izin mengikuti urutan katalog.
     *
     * Izin yang dibaca kembali dari basis data selalu berurut `sort_order`,
     * yaitu urutan `semua()`. Daftar bawaan di atas ditulis manusia dan
     * dikelompokkan menurut nalar, bukan menurut urutan itu — sehingga
     * membandingkan keduanya secara langsung akan gagal begitu ada izin baru
     * disisipkan di tengah katalog.
     *
     * Diurutkan di sini supaya penambahan izin berikutnya tidak menggagalkan
     * test yang sebenarnya tidak mempersoalkan urutan.
     *
     * @param  list<string>  $izin
     * @return list<string>
     */
    private static function urutKatalog(array $izin): array
    {
        $dimiliki = array_flip($izin);

        return array_values(array_filter(
            self::kunci(),
            fn (string $kunci) => isset($dimiliki[$kunci]),
        ));
    }
}
