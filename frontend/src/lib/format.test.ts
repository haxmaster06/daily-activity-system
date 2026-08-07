import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awalBulanApi,
  formatAngka,
  formatBulanTahun,
  formatTanggal,
  formatTanggalLengkap,
  formatTanggalRingkas,
  formatTanggalWaktu,
  formatUkuranBerkas,
  formatWaktu,
  geserHariApi,
  hariIniApi,
  parseAngka,
  toApiDate,
  toFileStamp,
} from './format';

/*
 * 30 Juli 2026 pukul 08.15 WIB, ditulis sebagai instan mutlak.
 *
 * Sebelumnya `new Date(2026, 6, 30, 8, 15)` — konstruktor waktu lokal. Nilai
 * seperti itu masuk sebagai waktu lokal dan keluar sebagai waktu lokal, jadi
 * zona waktu runtime saling meniadakan dan seluruh berkas ini lulus di zona
 * mana pun. Karena itulah tidak satu pun test di sini menangkap tampilan server
 * yang meleset tujuh jam.
 */
const contoh = new Date('2026-07-30T01:15:00Z');

/*
 * Seluruh masukan tanggal di berkas ini ditulis sebagai instan mutlak, tidak
 * satu pun memakai konstruktor waktu lokal. Satu titik waktu yang sama, dibaca
 * dari zona berbeda, menghasilkan tanggal dan jam berbeda — jadi keluarannya
 * hanya dapat tetap sama bila zonanya benar-benar dipatok di `format.ts`.
 *
 * Karena itu berkas ini bermakna hanya bila dijalankan pada lebih dari satu
 * zona. Dilakukan otomatis oleh `npm run test:zona`:
 *
 *     TZ=UTC              npx vitest run src/lib/format.test.ts
 *     TZ=Asia/Jakarta     npx vitest run src/lib/format.test.ts
 *     TZ=America/New_York npx vitest run src/lib/format.test.ts
 */

/** Sama dengan `contoh`, dalam bentuk string sebagaimana dikirim API. */
const instan = '2026-07-30T01:15:00Z';

/**
 * 30 Juli 2026, 23.30 UTC — sudah 31 Juli pukul 06.30 di Jakarta.
 *
 * Kasus yang paling merugikan: tiap laporan yang dikirim antara 00.00 dan
 * 07.00 WIB jatuh pada tanggal sebelumnya bila dibaca sebagai UTC, sehingga
 * tampil pada hari yang salah dan terhitung pada rekap bulan yang salah.
 */
const lewatTengahMalam = '2026-07-30T23:30:00Z';

describe('zona waktu tampilan', () => {
  it('membaca instan UTC sebagai waktu Jakarta', () => {
    expect(formatWaktu(instan)).toBe('08.15');
    expect(formatTanggalWaktu(instan)).toBe('30 Juli 2026, 08.15 WIB');
  });

  it('memajukan tanggal ketika di Jakarta hari sudah berganti', () => {
    expect(formatTanggal(lewatTengahMalam)).toBe('31 Juli 2026');
    expect(formatWaktu(lewatTengahMalam)).toBe('06.30');
  });

  it('memakai nama hari milik tanggal Jakarta, bukan tanggal UTC', () => {
    expect(formatTanggalLengkap(lewatTengahMalam)).toBe('Jumat, 31 Juli 2026');
  });

  it('memakai tanggal Jakarta pada bentuk ringkas dan bulan-tahun', () => {
    expect(formatTanggalRingkas(lewatTengahMalam)).toBe('31 Jul 2026');
    expect(formatBulanTahun('2026-07-31T17:30:00Z')).toBe('Agustus 2026');
  });

  /*
   * Keduanya dikecualikan dari Bahasa Indonesia, bukan dari zona waktunya.
   * `toApiDate` mengisi `<input type="date">` dan payload API: salah tanggal di
   * sini berarti laporan tersimpan pada hari yang bukan hari kerjanya.
   */
  it('memakai tanggal Jakarta pada keluaran teknis', () => {
    expect(toApiDate(lewatTengahMalam)).toBe('2026-07-31');
    expect(toFileStamp(lewatTengahMalam)).toBe('20260731-0630');
  });

  it('mengembalikan tanggal yang sama untuk masukan tanpa jam', () => {
    expect(toApiDate('2026-07-30')).toBe('2026-07-30');
    expect(formatTanggal('2026-07-30')).toBe('30 Juli 2026');
  });
});

/*
 * Jam-jam paling merugikan di aplikasi ini. Antara 00.00 dan 07.00 WIB, tanggal
 * UTC masih tanggal kemarin — dan di situlah nilai awal isian tanggal, batas
 * atas isian tanggal, serta rentang penyaring dihitung.
 *
 * Gejalanya bukan cuma tampilan: laporan pagi hari terisi tanggal kemarin, dan
 * tanggal hari ini ditolak sebagai "belum terjadi" sehingga laporan tidak dapat
 * dikirim sama sekali sampai lewat pukul tujuh.
 */
describe('tanggal hari ini menurut waktu Jakarta', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** 6 Agustus 2026 pukul 22.00 UTC — sudah 7 Agustus pukul 05.00 di Jakarta. */
  const pagiButaWib = new Date('2026-08-06T22:00:00Z');

  it('memakai tanggal Jakarta, bukan tanggal UTC', () => {
    vi.setSystemTime(pagiButaWib);
    expect(hariIniApi()).toBe('2026-08-07');
  });

  it('menghitung mundur sekian hari dari tanggal Jakarta', () => {
    vi.setSystemTime(pagiButaWib);
    expect(geserHariApi(-1)).toBe('2026-08-06');
    expect(geserHariApi(-30)).toBe('2026-07-08');
  });

  it('menyeberangi pergantian bulan dengan benar', () => {
    // 31 Juli pukul 18.00 UTC — sudah 1 Agustus pukul 01.00 di Jakarta.
    vi.setSystemTime(new Date('2026-07-31T18:00:00Z'));
    expect(hariIniApi()).toBe('2026-08-01');
    expect(awalBulanApi()).toBe('2026-08-01');
    expect(geserHariApi(-1)).toBe('2026-07-31');
  });

  it('menerima tanggal acuan selain hari ini', () => {
    expect(geserHariApi(1, '2026-02-28T20:00:00Z')).toBe('2026-03-02');
    expect(awalBulanApi('2026-12-31T17:30:00Z')).toBe('2027-01-01');
  });
});

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
    // Bentuk yang benar-benar dikirim Laravel: ISO 8601 dengan penanda zona.
    expect(formatTanggal('2026-07-30T01:15:00.000000Z')).toBe('30 Juli 2026');
  });
});

describe('format waktu', () => {
  it('memakai 24 jam dengan pemisah titik', () => {
    expect(formatWaktu(contoh)).toBe('08.15');
  });

  it('tidak memakai AM/PM maupun titik dua', () => {
    // 20.05 WIB = 13.05 UTC
    const hasil = formatWaktu('2026-07-30T13:05:00Z');
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
