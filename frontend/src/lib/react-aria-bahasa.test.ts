import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { KAMUS_REACT_ARIA, LOCALE, pasangBahasaReactAria, SIMBOL_KAMUS } from './react-aria-bahasa';

/**
 * Penjaga terhadap upgrade React Aria.
 *
 * Begitu kamus global terpasang, React Aria **melempar galat** untuk paket yang
 * tidak terdaftar maupun kunci yang tidak ada — bukan jatuh kembali ke bahasa
 * Inggris. Itu berarti menaikkan versi React Aria yang menambah satu kunci saja
 * dapat menjatuhkan halaman di hadapan pengguna.
 *
 * Test ini membaca kamus bawaan React Aria langsung dari `node_modules` dan
 * membandingkannya dengan berkas kita, sehingga upgrade semacam itu berhenti di
 * sini — bukan di layar pengguna.
 */

const DASAR = path.resolve(
  __dirname,
  '../../node_modules/react-aria/dist/private/intl',
);

/** Nama paket i18n React Aria dari nama foldernya. */
function namaPaket(folder: string): string {
  return `@react-aria/${folder}`;
}

/**
 * Kunci yang disediakan React Aria untuk satu paket, dibaca dari berkas
 * `en-US` bawaannya.
 */
function kunciBawaan(folder: string): string[] {
  const berkas = path.join(DASAR, folder, 'en-US.mjs');
  const isi = readFileSync(berkas, 'utf8');

  const badan = isi.split('exports = {')[1]?.split('\n};')[0] ?? '';

  return [...badan.matchAll(/^\s{4}"?([a-zA-Z0-9_ .-]+)"?:/gm)].map((cocok) => cocok[1]);
}

const FOLDER = readdirSync(DASAR, { withFileTypes: true })
  .filter((entri) => entri.isDirectory())
  .map((entri) => entri.name);

describe('kelengkapan kamus', () => {
  it('menemukan folder locale React Aria', () => {
    // Bila struktur node_modules berubah, seluruh test di bawah akan lulus
    // secara palsu karena tidak ada yang dibandingkan.
    expect(FOLDER.length).toBeGreaterThan(10);
  });

  /*
   * React Aria tidak menyertakan id-ID. Bila suatu saat menyertakannya, kamus
   * ini boleh dibuang — dan test ini yang akan memberi tahu.
   */
  it('memastikan React Aria memang belum menyediakan id-ID', () => {
    const punyaIndonesia = FOLDER.some((folder) =>
      readdirSync(path.join(DASAR, folder)).some((berkas) => berkas.startsWith('id-ID')),
    );

    expect(
      punyaIndonesia,
      'React Aria kini menyertakan id-ID — kamus di react-aria-bahasa.ts dapat ditinjau ulang.',
    ).toBe(false);
  });

  it('mencantumkan seluruh paket yang dikenal React Aria', () => {
    const seharusnya = FOLDER.map(namaPaket).sort();
    const dimiliki = Object.keys(KAMUS_REACT_ARIA).sort();

    /*
     * Paket yang tidak terdaftar membuat React Aria melempar galat, bukan
     * memakai bahasa Inggris. Karena itu daftarnya harus lengkap, termasuk
     * paket yang belum dipakai satu komponen pun.
     */
    expect(dimiliki).toEqual(seharusnya);
  });

  it.each(FOLDER)('memuat seluruh kunci paket %s', (folder) => {
    const kamus = KAMUS_REACT_ARIA[namaPaket(folder)];

    expect(kamus, `paket ${namaPaket(folder)} belum ada di kamus`).toBeDefined();

    const kurang = kunciBawaan(folder).filter((kunci) => !(kunci in kamus));

    expect(
      kurang,
      `kunci berikut belum diterjemahkan untuk ${namaPaket(folder)}: ${kurang.join(', ')}`,
    ).toEqual([]);
  });
});

describe('isi terjemahan', () => {
  it('tidak menyisakan teks Inggris yang sudah terbukti muncul di layar', () => {
    // Ketiganya ditemukan di peramban sebelum kamus ini ada.
    expect(KAMUS_REACT_ARIA['@react-aria/overlays'].dismiss).toBe('Tutup');
    expect(KAMUS_REACT_ARIA['@react-aria/calendar'].next).toBe('Berikutnya');
    expect(KAMUS_REACT_ARIA['@react-aria/calendar'].maximumDate).toBe(
      'Tanggal paling akhir yang tersedia',
    );
  });

  it('menyusun keterangan sel tanggal dalam Bahasa Indonesia', () => {
    const pesan = KAMUS_REACT_ARIA['@react-aria/calendar'].todayDateSelected;

    expect(typeof pesan).toBe('function');

    const hasil = (pesan as (a: Record<string, string>) => string)({
      date: 'Rabu, 5 Agustus 2026',
    });

    expect(hasil).toBe('Hari ini, Rabu, 5 Agustus 2026, terpilih');
    expect(hasil).not.toMatch(/today|selected/i);
  });
});

describe('pemasangan', () => {
  it('mengisi simbol global yang dibaca React Aria', () => {
    pasangBahasaReactAria();

    const global = globalThis as unknown as Record<symbol, unknown>;

    expect(global[SIMBOL_KAMUS]).toBe(KAMUS_REACT_ARIA);
    expect(global[Symbol.for('react-aria.i18n.locale')]).toBe(LOCALE);
  });
});
