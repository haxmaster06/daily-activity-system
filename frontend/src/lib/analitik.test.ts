import { describe, expect, it } from 'vitest';

import { labelMetrik, type Metrik } from './analitik';

function metrik(ubah: Partial<Metrik>): Metrik {
  return {
    penanda: 'x|box',
    kunci: 'x',
    label: 'Box',
    satuan: 'box',
    desimal: false,
    grup: [],
    template: [],
    ...ubah,
  };
}

/*
 * Tiga kolom berlabel "Box" dalam satu template — QTY Dibutuhkan, QTY Selesai,
 * dan Kekurangan — menghasilkan tiga pilihan yang identik di layar. Pembaca
 * tidak punya cara menebak mana yang mana.
 */
describe('labelMetrik', () => {
  it('membiarkan label yang sudah unik apa adanya', () => {
    const semua = [
      metrik({ penanda: 'a|kg', kunci: 'a', label: 'Brontol', satuan: 'kg' }),
      metrik({ penanda: 'b|box', kunci: 'b', label: 'Box', satuan: 'box' }),
    ];

    expect(labelMetrik(semua[0], semua)).toBe('Brontol (kg)');
    expect(labelMetrik(semua[1], semua)).toBe('Box (box)');
  });

  it('menambahkan grup kolom pada label yang berulang', () => {
    const semua = [
      metrik({ penanda: 'butuh|box', kunci: 'butuh_box', grup: ['QTY Dibutuhkan'] }),
      metrik({ penanda: 'selesai|box', kunci: 'selesai_box', grup: ['QTY Selesai'] }),
      metrik({ penanda: 'kurang|box', kunci: 'kurang_box', grup: ['Kekurangan'] }),
    ];

    expect(labelMetrik(semua[0], semua)).toBe('Box (box) — QTY Dibutuhkan');
    expect(labelMetrik(semua[1], semua)).toBe('Box (box) — QTY Selesai');
    expect(labelMetrik(semua[2], semua)).toBe('Box (box) — Kekurangan');
  });

  it('memakai nama template bila kolomnya tidak bergrup', () => {
    const semua = [
      metrik({ penanda: 'a|box', kunci: 'a', template: ['Proses Harian'] }),
      metrik({ penanda: 'b|box', kunci: 'b', template: ['SPK & Pemenuhan Order'] }),
    ];

    expect(labelMetrik(semua[0], semua)).toBe('Box (box) — Proses Harian');
    expect(labelMetrik(semua[1], semua)).toBe('Box (box) — SPK & Pemenuhan Order');
  });

  it('tetap mengembalikan label dasar bila tidak ada pembeda sama sekali', () => {
    const semua = [
      metrik({ penanda: 'a|box', kunci: 'a' }),
      metrik({ penanda: 'b|box', kunci: 'b' }),
    ];

    expect(labelMetrik(semua[0], semua)).toBe('Box (box)');
  });

  it('membedakan label sama yang satuannya berbeda tanpa pembeda tambahan', () => {
    const semua = [
      metrik({ penanda: 'a|box', kunci: 'a', satuan: 'box' }),
      metrik({ penanda: 'a|kg', kunci: 'a', satuan: 'kg' }),
    ];

    expect(labelMetrik(semua[0], semua)).toBe('Box (box)');
    expect(labelMetrik(semua[1], semua)).toBe('Box (kg)');
  });
});
