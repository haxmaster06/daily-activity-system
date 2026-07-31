<?php

use App\Support\JangkauanData;

/**
 * Aturan jangkauan diuji tanpa basis data.
 *
 * `dariPenetapan()` sengaja dipisahkan dari `untuk()` supaya "tertinggi menang"
 * dan "menumpuk" dapat diperiksa langsung, tanpa menyiapkan pengguna, peran,
 * dan pivot lebih dulu.
 */
function jangkauan(array $penetapan, ?int $departemenPengguna = 7): JangkauanData
{
    return JangkauanData::dariPenetapan($penetapan, $departemenPengguna, 99);
}

function penetapan(int $level, ?int $departemen = null): array
{
    return ['scope_level' => $level, 'department_id' => $departemen];
}

it('memberi jangkauan Personal bila tidak ada penetapan sama sekali', function (): void {
    $hasil = jangkauan([]);

    // Deny by default: belum diatur berarti hanya data sendiri, bukan semuanya.
    expect($hasil->level)->toBe(JangkauanData::PERSONAL)
        ->and($hasil->personal())->toBeTrue()
        ->and($hasil->departemenId)->toBe([]);
});

it('memakai jangkauan tertinggi bila penetapannya berbeda tingkat', function (): void {
    $hasil = jangkauan([
        penetapan(JangkauanData::PERSONAL),
        penetapan(JangkauanData::DEPARTEMEN, 3),
    ]);

    expect($hasil->level)->toBe(JangkauanData::DEPARTEMEN)
        ->and($hasil->departemenId)->toBe([3]);
});

it('mengalahkan Departemen dengan Korporat', function (): void {
    $hasil = jangkauan([
        penetapan(JangkauanData::DEPARTEMEN, 3),
        penetapan(JangkauanData::KORPORAT),
    ]);

    expect($hasil->korporat())->toBeTrue()
        // Himpunan departemen tidak relevan lagi pada tingkat Korporat.
        ->and($hasil->departemenId)->toBe([]);
});

it('menumpuk beberapa penetapan Departemen menjadi satu himpunan', function (): void {
    $hasil = jangkauan([
        penetapan(JangkauanData::DEPARTEMEN, 5),
        penetapan(JangkauanData::DEPARTEMEN, 2),
        penetapan(JangkauanData::DEPARTEMEN, 5),
    ]);

    expect($hasil->departemenId)->toBe([2, 5]);
});

it('membaca departemen kosong sebagai departemen pengguna', function (): void {
    $hasil = jangkauan([penetapan(JangkauanData::DEPARTEMEN)], departemenPengguna: 7);

    expect($hasil->departemenId)->toBe([7]);
});

it('mengabaikan penetapan Departemen kosong bila pengguna tanpa departemen', function (): void {
    $hasil = jangkauan([penetapan(JangkauanData::DEPARTEMEN)], departemenPengguna: null);

    // Tingkatnya tetap Departemen, tetapi tidak ada departemen yang tercakup —
    // sehingga yang terlihat hanya laporannya sendiri.
    expect($hasil->level)->toBe(JangkauanData::DEPARTEMEN)
        ->and($hasil->departemenId)->toBe([]);
});

it('menentukan departemen mana yang tercakup', function (): void {
    $hasil = jangkauan([penetapan(JangkauanData::DEPARTEMEN, 3)]);

    expect($hasil->mencakupDepartemen(3))->toBeTrue()
        ->and($hasil->mencakupDepartemen(4))->toBeFalse()
        ->and($hasil->mencakupDepartemen(null))->toBeFalse();
});

it('mencakup departemen apa pun pada jangkauan Korporat', function (): void {
    $hasil = jangkauan([penetapan(JangkauanData::KORPORAT)]);

    expect($hasil->mencakupDepartemen(123))->toBeTrue();
});

it('tidak mencakup departemen apa pun pada jangkauan Personal', function (): void {
    $hasil = jangkauan([penetapan(JangkauanData::PERSONAL)]);

    expect($hasil->mencakupDepartemen(7))->toBeFalse();
});

it('memberi label siap tampil, bukan angka tingkat', function (): void {
    expect(jangkauan([])->label())->toBe('Pribadi')
        ->and(jangkauan([penetapan(JangkauanData::DEPARTEMEN, 1)])->label())->toBe('Departemen')
        ->and(jangkauan([penetapan(JangkauanData::KORPORAT)])->label())->toBe('Korporat');
});
