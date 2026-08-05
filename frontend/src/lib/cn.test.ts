import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { cn, SKALA_HURUF } from './cn';

/**
 * Penjaga terhadap kelas yang hilang diam-diam.
 *
 * `tailwind-merge` membuang kelas yang dianggapnya bentrok. Bila skala huruf
 * project tidak didaftarkan, `text-body` dianggap warna dan membuang
 * `text-white` — tombol biru bertuliskan hitam, tanpa peringatan di mana pun.
 */
describe('bentrok ukuran huruf dan warna', () => {
  it('mempertahankan warna teks saat digabung dengan ukuran huruf', () => {
    // Persis susunan yang dipakai komponen Button: warna dari varian, ukuran
    // huruf dari ukuran tombol.
    expect(cn('bg-primary text-white', 'h-8 px-2.5 text-body')).toContain('text-white');
    expect(cn('bg-primary text-white', 'h-8 px-2.5 text-body')).toContain('text-body');
  });

  it.each([...SKALA_HURUF])('mempertahankan warna saat digabung dengan text-%s', (ukuran) => {
    const hasil = cn('text-ink-muted', `text-${ukuran}`);

    expect(hasil).toContain('text-ink-muted');
    expect(hasil).toContain(`text-${ukuran}`);
  });

  it('tetap membuang ukuran huruf yang benar-benar bentrok', () => {
    // Dua ukuran huruf memang harus disaring — yang terakhir menang.
    expect(cn('text-body', 'text-page-title')).toBe('text-page-title');
  });

  it('tetap membuang warna teks yang benar-benar bentrok', () => {
    expect(cn('text-white', 'text-ink')).toBe('text-ink');
  });
});

describe('kesamaan dengan tailwind.config.ts', () => {
  /*
   * Skala huruf ditulis di dua tempat: `tailwind.config.ts` yang membangkitkan
   * kelasnya, dan `cn.ts` yang memberi tahu tailwind-merge artinya. Menambah
   * ukuran baru hanya di satu tempat membuat kelas warna hilang diam-diam pada
   * ukuran itu saja — cacat yang sangat sulit dilacak dari layar.
   */
  it('memuat seluruh ukuran huruf yang ada di tailwind.config.ts', () => {
    const konfigurasi = readFileSync(
      path.resolve(__dirname, '../../tailwind.config.ts'),
      'utf8',
    );

    const badan = konfigurasi.split('fontSize: {')[1]?.split('\n      },')[0] ?? '';
    const ukuran = [...badan.matchAll(/^\s*'?([a-z-]+)'?:\s*\[/gm)].map((cocok) => cocok[1]);

    expect(ukuran.length).toBeGreaterThan(0);
    expect([...SKALA_HURUF].sort()).toEqual(ukuran.sort());
  });
});
