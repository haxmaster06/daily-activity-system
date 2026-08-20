import { describe, expect, it } from 'vitest';

import { totalKolom } from './laporan';
import type { KolomTemplate } from './template';

function kolom(over: Partial<KolomTemplate>): KolomTemplate {
  return {
    id: 1,
    kunci: 'k',
    label: 'K',
    grup: null,
    tipe: 'decimal',
    wajib: false,
    urutan: 0,
    satuan: null,
    placeholder: null,
    bantuan: null,
    pilihan: null,
    sumber_master: null,
    rumus: null,
    nilai_min: null,
    nilai_maks: null,
    desimal: 2,
    master_jenis_id: null,
    master_jenis: null,
    master_induk_kunci: null,
    beku: false,
    total: true,
    tampilan: null,
    ...over,
  };
}

describe('totalKolom', () => {
  it('menjumlahkan angka desimal apa adanya, mengabaikan yang kosong', () => {
    const berat = kolom({ kunci: 'berat' });

    expect(totalKolom(berat, [{ berat: 12.5 }, { berat: 7.25 }, { berat: null }])).toBe(19.75);
  });

  it('menjumlahkan kolom rumus dari hasil hitung per baris, bukan nilai tersimpan', () => {
    const sisa = kolom({ kunci: 'sisa', rumus: 'masuk - keluar' });

    // (10 - 3) + (5.5 - 0.5) = 12
    expect(totalKolom(sisa, [
      { masuk: 10, keluar: 3 },
      { masuk: 5.5, keluar: 0.5 },
    ])).toBe(12);
  });
});
