<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sesi Pengguna
    |--------------------------------------------------------------------------
    |
    | Masa berlaku dihitung dari aktivitas terakhir, bukan dari waktu masuk.
    | Selama aplikasi dipakai, sesinya diperpanjang oleh middleware
    | `PerpanjangSesi`; yang meninggalkan komputer tetap keluar sendiri.
    |
    | Karena itu `sanctum.expiration` dimatikan: batas mutlak sejak `created_at`
    | akan memutus pengguna yang sedang bekerja, tepat pada jam yang paling
    | merepotkan.
    |
    */

    'sesi' => [

        // Menit tanpa aktivitas sebelum sesi berakhir.
        'menit' => (int) env('DAMS_SESI_MENIT', 720),

        // Dipakai bila pengguna mencentang "Ingat saya". Sengaja dibatasi:
        // perangkat di area produksi sering dipakai bergantian, sehingga sesi
        // tidak boleh berlaku tanpa batas.
        'menit_diingat' => (int) env('DAMS_SESI_MENIT_DIINGAT', 10080),

        /*
         * Jumlah perangkat yang boleh dipakai bersamaan oleh satu akun.
         * Melebihi batas, token tertua yang dibuang — bukan yang terbaru,
         * supaya masuk dari perangkat baru tidak pernah gagal.
         */
        'maksimal_perangkat' => (int) env('DAMS_SESI_MAKSIMAL_PERANGKAT', 5),

        /*
         * Sesi hanya diperpanjang bila sisa umurnya sudah kurang dari bagian
         * ini. Tanpa ambang, setiap permintaan menulis ke basis data hanya
         * untuk menggeser waktu beberapa detik.
         */
        'ambang_perpanjangan' => (float) env('DAMS_SESI_AMBANG_PERPANJANGAN', 0.5),

    ],

];
