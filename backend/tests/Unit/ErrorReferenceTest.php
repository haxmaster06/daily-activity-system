<?php

use App\Support\ErrorReference;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    Cache::flush();
});

it('membentuk kode referensi berpola ERR-YYYYMMDD-NNN', function (): void {
    expect(ErrorReference::generate())->toMatch('/^ERR-\d{8}-\d{3}$/');
});

it('memakai tanggal hari ini', function (): void {
    expect(ErrorReference::generate())->toStartWith('ERR-'.now()->format('Ymd').'-');
});

it('menaikkan nomor urut pada tiap galat di hari yang sama', function (): void {
    expect(ErrorReference::generate())->toEndWith('-001')
        ->and(ErrorReference::generate())->toEndWith('-002')
        ->and(ErrorReference::generate())->toEndWith('-003');
});
