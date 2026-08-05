<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sesi Pengguna
    |--------------------------------------------------------------------------
    |
    | Keluar otomatis DIMATIKAN atas permintaan pemilik project: pengguna yang
    | sedang mengisi laporan panjang pernah terlempar keluar dan kehilangan
    | isiannya. Sesi kini berlaku sampai pengguna menekan Keluar.
    |
    | Nilai 0 pada ketiga setelan di bawah berarti "tanpa batas". Diisi angka
    | lebih dari 0, mekanismenya hidup kembali tanpa perubahan kode:
    | masa berlaku dihitung dari aktivitas terakhir — bukan dari waktu masuk —
    | dan digeser middleware `PerpanjangSesi` selama aplikasi dipakai.
    |
    | Yang perlu diketahui sebelum membiarkannya mati:
    |
    | - Token yang tidak pernah kedaluwarsa tetap berlaku selamanya bila
    |   tercuri. Tidak ada lagi batas waktu yang menutupnya sendiri.
    | - Perangkat di area produksi sering dipakai bergantian. Yang lupa menekan
    |   Keluar meninggalkan sesinya terbuka untuk pemakai berikutnya.
    |
    | Cara mencabutnya bila terjadi: nonaktifkan akunnya, atau atur ulang kata
    | sandinya — keduanya membuang seluruh token pengguna tersebut.
    |
    | `sanctum.expiration` tetap dimatikan. Batas mutlak sejak `created_at`
    | memutus pengguna yang sedang bekerja, tepat pada jam yang paling
    | merepotkan.
    |
    */

    'sesi' => [

        // Menit tanpa aktivitas sebelum sesi berakhir. 0 = tanpa batas.
        'menit' => (int) env('DAMS_SESI_MENIT', 0),

        // Dipakai bila pengguna mencentang "Ingat saya". 0 = tanpa batas.
        'menit_diingat' => (int) env('DAMS_SESI_MENIT_DIINGAT', 0),

        /*
         * Jumlah perangkat yang boleh dipakai bersamaan oleh satu akun.
         * 0 = tanpa batas.
         *
         * Ikut dimatikan, dan itu memang perlu. Batas ini membuang token
         * tertua saat jumlahnya terlampaui — artinya masuk dari perangkat
         * baru mengeluarkan seseorang yang mungkin sedang bekerja. Selama
         * sesi tidak lagi kedaluwarsa sendiri, token juga tidak pernah
         * berkurang, sehingga batas itu akan tersentuh jauh lebih sering.
         *
         * Bila dihidupkan lagi: yang tertua yang dibuang, bukan yang terbaru,
         * supaya masuk dari perangkat baru tidak pernah gagal.
         */
        'maksimal_perangkat' => (int) env('DAMS_SESI_MAKSIMAL_PERANGKAT', 0),

        /*
         * Sesi hanya diperpanjang bila sisa umurnya sudah kurang dari bagian
         * ini. Tanpa ambang, setiap permintaan menulis ke basis data hanya
         * untuk menggeser waktu beberapa detik.
         */
        'ambang_perpanjangan' => (float) env('DAMS_SESI_AMBANG_PERPANJANGAN', 0.5),

    ],

    /*
    |--------------------------------------------------------------------------
    | Backup Database
    |--------------------------------------------------------------------------
    |
    | ADR-008 melarang `migrate:fresh` dan mewajibkan backup sebelum `migrate`
    | di lingkungan mana pun selain database lokal sekali pakai. Larangan tanpa
    | perintah backup yang benar-benar ada hanya menggeser tanggung jawab.
    |
    | Dijalankan `dams:backup`, dan diuji pulih `dams:uji-restore`. Backup yang
    | tidak pernah diuji pulih bukanlah backup: dump yang terpotong atau
    | kehilangan satu tabel baru ketahuan pada hari data aslinya sudah hilang.
    |
    | `folder` sebaiknya berada di luar folder aplikasi, dan disalin ke luar
    | server utama. Backup yang tersimpan di server yang sama ikut hilang
    | bersama servernya.
    |
    */

    'backup' => [

        'folder' => env('DAMS_BACKUP_FOLDER', storage_path('backup')),

        /*
         * Jalur mysqldump dan mysql. Di Windows dengan Laragon keduanya tidak
         * ada di PATH, sehingga jalurnya perlu ditulis penuh.
         */
        'mysqldump' => env('DAMS_MYSQLDUMP', 'mysqldump'),
        'mysql' => env('DAMS_MYSQL', 'mysql'),

        // Jumlah backup terakhir yang dipertahankan penjadwal.
        'simpan' => (int) env('DAMS_BACKUP_SIMPAN', 14),

    ],

];
