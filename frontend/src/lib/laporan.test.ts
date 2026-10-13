import { describe, expect, it } from 'vitest';

import { lengkapiTanggalWajib, totalKolom, type NilaiBaris } from './laporan';
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

describe('lengkapiTanggalWajib', () => {
  const tanggalProduksi = kolom({ kunci: 'tanggal_produksi', tipe: 'date', wajib: true });
  const tanggalKirim = kolom({ kunci: 'tanggal_kirim', tipe: 'date', wajib: false });
  const lot = kolom({ kunci: 'lot', tipe: 'text', wajib: true });

  function bagian(baris: NilaiBaris[]) {
    return [{ template: { kolom: [tanggalProduksi, tanggalKirim, lot] }, baris }];
  }

  it('mengisi sel tanggal wajib yang kosong dengan tanggal laporan', () => {
    const hasil = lengkapiTanggalWajib(bagian([{ lot: '089' }]), '2026-08-19');

    expect(hasil[0].baris[0].tanggal_produksi).toBe('2026-08-19');
  });

  it('tidak menimpa tanggal yang sudah diisi sendiri', () => {
    const hasil = lengkapiTanggalWajib(
      bagian([{ tanggal_produksi: '2026-08-01', lot: '089' }]),
      '2026-08-19',
    );

    expect(hasil[0].baris[0].tanggal_produksi).toBe('2026-08-01');
  });

  it('mengabaikan kolom tanggal yang tidak wajib dan kolom non-tanggal', () => {
    const hasil = lengkapiTanggalWajib(bagian([{ lot: '089' }]), '2026-08-19');

    // tanggal_kirim (tak wajib) & lot (bukan tanggal) tetap apa adanya.
    expect(hasil[0].baris[0].tanggal_kirim).toBeUndefined();
    expect(hasil[0].baris[0].lot).toBe('089');
  });

  it('mengembalikan referensi yang sama bila tak ada yang perlu diisi', () => {
    const awal = bagian([{ tanggal_produksi: '2026-08-19', lot: '089' }]);

    expect(lengkapiTanggalWajib(awal, '2026-08-19')).toBe(awal);
  });

  it('tidak mengubah apa pun saat tanggal laporan belum ada', () => {
    const awal = bagian([{ lot: '089' }]);

    expect(lengkapiTanggalWajib(awal, null)).toBe(awal);
  });
});
