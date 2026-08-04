import { describe, expect, it } from 'vitest';

import {
  formatAngka,
  formatBulanTahun,
  formatTanggal,
  formatTanggalLengkap,
  formatTanggalRingkas,
  formatTanggalWaktu,
  formatUkuranBerkas,
  formatWaktu,
  parseAngka,
  toApiDate,
  toFileStamp,
} from './format';

// Waktu lokal — 30 Juli 2026 pukul 08.15
const contoh = new Date(2026, 6, 30, 8, 15, 0);

describe('format tanggal', () => {
  it('menulis bulan dengan nama panjang Bahasa Indonesia', () => {
    expect(formatTanggal(contoh)).toBe('30 Juli 2026');
  });

  it('tidak memakai format bulan/hari/tahun bergaya Amerika', () => {
    expect(formatTanggal(contoh)).not.toContain('/');
  });

  it('menyertakan nama hari pada bentuk lengkap', () => {
    expect(formatTanggalLengkap(contoh)).toBe('Kamis, 30 Juli 2026');
  });

  it('memendekkan nama bulan untuk sel tabel', () => {
    expect(formatTanggalRingkas(contoh)).toBe('30 Jul 2026');
  });

  it('menampilkan bulan dan tahun saja', () => {
    expect(formatBulanTahun(contoh)).toBe('Juli 2026');
  });

  it('mengembalikan tanda pisah untuk nilai kosong', () => {
    expect(formatTanggal(null)).toBe('—');
    expect(formatTanggal('')).toBe('—');
    expect(formatTanggal('bukan tanggal')).toBe('—');
  });

  it('menerima string ISO dari API', () => {
    expect(formatTanggal('2026-07-30T08:15:00')).toBe('30 Juli 2026');
  });
});

describe('format waktu', () => {
  it('memakai 24 jam dengan pemisah titik', () => {
    expect(formatWaktu(contoh)).toBe('08.15');
  });

  it('tidak memakai AM/PM maupun titik dua', () => {
    const hasil = formatWaktu(new Date(2026, 6, 30, 20, 5, 0));
    expect(hasil).toBe('20.05');
    expect(hasil).not.toMatch(/AM|PM|:/i);
  });

  it('menggabungkan tanggal, waktu, dan zona', () => {
    expect(formatTanggalWaktu(contoh)).toBe('30 Juli 2026, 08.15 WIB');
  });
});

describe('format teknis yang dikecualikan', () => {
  it('menghasilkan tanggal ISO untuk payload API', () => {
    expect(toApiDate(contoh)).toBe('2026-07-30');
  });

  it('menghasilkan stempel waktu untuk nama berkas', () => {
    expect(toFileStamp(contoh)).toBe('20260730-0815');
  });
});

describe('format angka', () => {
  it('memakai pemisah ribuan titik dan desimal koma', () => {
    expect(formatAngka(1234)).toBe('1.234');
    expect(formatAngka(1234.5, 1)).toBe('1.234,5');
  });

  it('mengembalikan tanda pisah untuk nilai kosong', () => {
    expect(formatAngka(null)).toBe('—');
  });

  it('menampilkan ukuran berkas lampiran', () => {
    expect(formatUkuranBerkas(2_516_582)).toBe('2,4 MB');
    expect(formatUkuranBerkas(0)).toBe('—');
  });
});

describe('urai angka', () => {
  it('membaca koma sebagai pemisah desimal', () => {
    expect(parseAngka('12,75')).toBe(12.75);
    expect(parseAngka('0,25')).toBe(0.25);
    expect(parseAngka('-3,5')).toBe(-3.5);
  });

  it('membaca titik sebagai desimal bila di belakangnya paling banyak dua angka', () => {
    // Papan angka mengetikkan titik, dan yang dimaksud hampir selalu desimal.
    expect(parseAngka('12.75')).toBe(12.75);
    expect(parseAngka('0.5')).toBe(0.5);
  });

  it('membaca titik sebagai pemisah ribuan bila bukan bentuk desimal', () => {
    expect(parseAngka('1.234')).toBe(1234);
    expect(parseAngka('1.234.567')).toBe(1234567);
  });

  it('memakai pemisah paling kanan ketika koma dan titik hadir bersama', () => {
    expect(parseAngka('1.234,5')).toBe(1234.5);
    expect(parseAngka('1,234.5')).toBe(1234.5);
    expect(parseAngka('1.234.567,89')).toBe(1234567.89);
  });

  it('mengembalikan null untuk isian yang bukan angka', () => {
    expect(parseAngka('')).toBeNull();
    expect(parseAngka('   ')).toBeNull();
    expect(parseAngka('-')).toBeNull();
    expect(parseAngka('abc')).toBeNull();
    expect(parseAngka('12kg')).toBeNull();
    expect(parseAngka(null)).toBeNull();
    expect(parseAngka(undefined)).toBeNull();
  });

  it('meneruskan angka yang memang sudah berupa angka', () => {
    expect(parseAngka(12.75)).toBe(12.75);
    expect(parseAngka(0)).toBe(0);
    expect(parseAngka(Number.NaN)).toBeNull();
  });

  it('bolak-balik dengan formatAngka tanpa berubah nilai', () => {
    // Inilah jaring pengamannya: apa pun yang ditampilkan ke pengguna harus
    // dapat dibaca kembali menjadi angka yang sama persis.
    for (const [angka, desimal] of [
      [0, 0],
      [7, 0],
      [1234, 0],
      [1234.5, 1],
      [1234567.89, 2],
      [-980.25, 2],
      [0.125, 3],
    ] as const) {
      expect(parseAngka(formatAngka(angka, desimal))).toBe(angka);
    }
  });
});
