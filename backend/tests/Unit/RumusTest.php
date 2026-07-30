<?php

use App\Support\Rumus;

/**
 * Rumus kolom hitungan selalu dievaluasi di server; nilainya tidak pernah
 * diterima dari klien.
 */
it('menghitung operasi dasar', function (): void {
    $nilai = ['masuk' => 100, 'keluar' => 40];

    expect(Rumus::hitung('masuk - keluar', $nilai))->toBe(60.0);
    expect(Rumus::hitung('masuk + keluar', $nilai))->toBe(140.0);
    expect(Rumus::hitung('masuk * 2', $nilai))->toBe(200.0);
    expect(Rumus::hitung('masuk / 4', $nilai))->toBe(25.0);
});

it('menghormati urutan operasi dan kurung', function (): void {
    $nilai = ['a' => 2, 'b' => 3, 'c' => 4];

    expect(Rumus::hitung('a + b * c', $nilai))->toBe(14.0);
    expect(Rumus::hitung('(a + b) * c', $nilai))->toBe(20.0);
});

it('menghitung persentase seperti pada lembar produksi', function (): void {
    $nilai = ['keluar' => 750, 'target' => 1000];

    expect(Rumus::hitung('keluar / target * 100', $nilai))->toBe(75.0);
});

it('memperlakukan kolom kosong sebagai nol', function (): void {
    // Baris yang baru terisi sebagian tetap menghasilkan angka.
    expect(Rumus::hitung('masuk - keluar', ['masuk' => 50]))->toBe(50.0);
    expect(Rumus::hitung('masuk - keluar', []))->toBe(0.0);
});

it('memperlakukan teks bukan angka sebagai nol', function (): void {
    expect(Rumus::hitung('masuk - keluar', ['masuk' => 50, 'keluar' => 'nd']))->toBe(50.0);
});

it('mengembalikan null saat membagi nol', function (): void {
    expect(Rumus::hitung('masuk / kosong', ['masuk' => 10, 'kosong' => 0]))->toBeNull();
});

it('mengembalikan null untuk rumus yang tidak lengkap', function (): void {
    expect(Rumus::hitung('masuk -', ['masuk' => 10]))->toBeNull();
    expect(Rumus::hitung('(masuk - keluar', ['masuk' => 10]))->toBeNull();
    expect(Rumus::hitung('', []))->toBeNull();
});

it('tidak mengeksekusi apa pun di luar aritmetika', function (): void {
    /*
     * Bahasanya sengaja sempit: tidak ada pemanggilan fungsi, tidak ada eval.
     * Teks yang menyerupai pemanggilan fungsi hanya dibaca sebagai nama kolom
     * yang nilainya nol — tidak ada yang dijalankan.
     */
    expect(Rumus::hitung('phpinfo()', []))->toBe(0.0);
    expect(Rumus::hitung('masuk + system', ['masuk' => 5]))->toBe(5.0);
    expect(Rumus::hitung('masuk + exec', ['masuk' => 5, 'exec' => 3]))->toBe(8.0);

    // Nilai bernama sama dengan fungsi PHP tetap diperlakukan sebagai data.
    expect(Rumus::hitung('file_get_contents', ['file_get_contents' => 7]))->toBe(7.0);
});

it('membulatkan hasil ke tiga angka di belakang koma', function (): void {
    expect(Rumus::hitung('a / b', ['a' => 10, 'b' => 3]))->toBe(3.333);
});
