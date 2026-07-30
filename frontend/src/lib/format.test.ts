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
