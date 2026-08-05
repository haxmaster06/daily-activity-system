import { beforeEach, describe, expect, it } from 'vitest';

import { bacaDraf, drafBerisi, hapusDraf, kunciDraf, simpanDraf } from './draf-laporan';

/*
 * Draf adalah satu-satunya yang melindungi isian laporan yang sedang diketik.
 * Sebelum ada modul ini, menutup tab berarti kehilangan seluruh ketikan tanpa
 * jejak.
 */
describe('draf laporan', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const isi = {
    tanggal: '2026-08-04',
    bagian: [{ templateId: 1, baris: [{ aktivitas: 'Menimbang', qty: 12 }] }],
  };

  it('menyimpan dan membaca kembali isian yang sama', () => {
    simpanDraf(undefined, isi);

    const draf = bacaDraf();

    expect(draf?.tanggal).toBe('2026-08-04');
    expect(draf?.bagian[0].baris[0].aktivitas).toBe('Menimbang');
  });

  it('memisahkan draf laporan baru dari draf penyuntingan', () => {
    simpanDraf(undefined, isi);
    simpanDraf(7, { tanggal: '2026-08-01', bagian: [] });

    // Menyunting laporan lama tidak boleh menimpa laporan baru yang sedang
    // disusun bersamaan.
    expect(bacaDraf()?.tanggal).toBe('2026-08-04');
    expect(bacaDraf(7)?.tanggal).toBe('2026-08-01');
    expect(kunciDraf()).not.toBe(kunciDraf(7));
  });

  it('menghapus draf', () => {
    simpanDraf(undefined, isi);
    hapusDraf(undefined);

    expect(bacaDraf()).toBeNull();
  });

  it('membuang draf yang sudah terlalu tua', () => {
    // Ditulis langsung supaya tanggalnya dapat dimundurkan.
    window.localStorage.setItem(
      kunciDraf(),
      JSON.stringify({
        ...isi,
        disimpanPada: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      }),
    );

    expect(bacaDraf()).toBeNull();
    // Sekalian dibersihkan, bukan hanya diabaikan.
    expect(window.localStorage.getItem(kunciDraf())).toBeNull();
  });

  it('membuang draf yang rusak tanpa menggagalkan pemanggilnya', () => {
    window.localStorage.setItem(kunciDraf(), 'bukan json');

    expect(bacaDraf()).toBeNull();
  });

  it('mengenali draf yang seluruh selnya kosong', () => {
    expect(drafBerisi({ bagian: [] })).toBe(false);
    expect(
      drafBerisi({ bagian: [{ templateId: 1, baris: [{ a: null, b: '', c: false }] }] }),
    ).toBe(false);
    expect(drafBerisi({ bagian: [{ templateId: 1, baris: [{ a: 0 }] }] })).toBe(true);
  });
});
