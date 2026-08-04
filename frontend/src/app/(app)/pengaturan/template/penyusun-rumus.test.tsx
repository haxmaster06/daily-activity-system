import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PenyusunRumus, pecahRumus, rumusSah, type KolomRujukan } from './penyusun-rumus';

const RUJUKAN: KolomRujukan[] = [
  { kunci: 'qty_masuk', label: 'Qty Masuk' },
  { kunci: 'qty_keluar', label: 'Qty Keluar' },
];

function Terkendali({ awal = '', onUbah }: { awal?: string; onUbah: (r: string) => void }) {
  const [nilai, setNilai] = useState(awal);

  return (
    <PenyusunRumus
      id="rumus"
      nilai={nilai}
      onUbah={(baru) => {
        setNilai(baru);
        onUbah(baru);
      }}
      rujukan={RUJUKAN}
    />
  );
}

describe('pecahRumus', () => {
  it('memakai pemisah yang sama dengan penghitungnya', () => {
    // Kalau berbeda, rumus yang tampil benar di layar bisa gagal dihitung saat
    // laporan disimpan.
    expect(pecahRumus('qty_masuk - qty_keluar')).toEqual(['qty_masuk', '-', 'qty_keluar']);
    expect(pecahRumus('(a + b) * 2')).toEqual(['(', 'a', '+', 'b', ')', '*', '2']);
    expect(pecahRumus('')).toEqual([]);
  });
});

describe('rumusSah', () => {
  it('menerima rumus lengkap yang kolomnya dikenal', () => {
    expect(rumusSah('qty_masuk - qty_keluar', RUJUKAN)).toBe(true);
    expect(rumusSah('(qty_masuk + qty_keluar) / 2', RUJUKAN)).toBe(true);
  });

  it('menolak kurung yang tidak berpasangan', () => {
    expect(rumusSah('(qty_masuk - qty_keluar', RUJUKAN)).toBe(false);
    expect(rumusSah('qty_masuk - qty_keluar)', RUJUKAN)).toBe(false);
  });

  it('menolak rumus yang menyebut kolom tak dikenal', () => {
    // Inilah salah ketik yang dulu tersimpan tanpa keluhan lalu menghitung nol.
    expect(rumusSah('qty_masuk - qty_kelaur', RUJUKAN)).toBe(false);
  });

  it('menolak rumus yang belum lengkap', () => {
    expect(rumusSah('qty_masuk -', RUJUKAN)).toBe(false);
    expect(rumusSah('', RUJUKAN)).toBe(false);
  });
});

describe('PenyusunRumus', () => {
  it('menyusun rumus dari klik, bukan ketikan', async () => {
    const pengguna = userEvent.setup();
    const onUbah = vi.fn();
    render(<Terkendali onUbah={onUbah} />);

    await pengguna.click(screen.getByRole('button', { name: 'Qty Masuk' }));
    await pengguna.click(screen.getByRole('button', { name: 'Tambah −' }));
    await pengguna.click(screen.getByRole('button', { name: 'Qty Keluar' }));

    expect(onUbah).toHaveBeenLastCalledWith('qty_masuk - qty_keluar');
  });

  it('menampilkan label kolom, bukan kunci basis datanya', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali onUbah={vi.fn()} />);

    await pengguna.click(screen.getByRole('button', { name: 'Qty Masuk' }));

    // §1.4: nama kolom basis data tidak boleh tampil ke layar.
    expect(screen.queryByText('qty_masuk')).toBeNull();
  });

  it('menghapus bagian terakhir', async () => {
    const pengguna = userEvent.setup();
    const onUbah = vi.fn();
    render(<Terkendali awal="qty_masuk - qty_keluar" onUbah={onUbah} />);

    await pengguna.click(screen.getByRole('button', { name: 'Hapus bagian terakhir' }));

    expect(onUbah).toHaveBeenLastCalledWith('qty_masuk -');
  });

  it('memberi tahu ketika rumusnya belum lengkap', () => {
    render(<Terkendali awal="qty_masuk -" onUbah={vi.fn()} />);

    expect(screen.getByText(/belum lengkap/i)).toBeTruthy();
  });

  it('menampilkan pratinjau hasil dengan angka contoh', () => {
    render(<Terkendali awal="qty_masuk - qty_keluar" onUbah={vi.fn()} />);

    // 120 - 45 = 75, memakai angka contoh tetap milik komponen.
    expect(screen.getByText('75')).toBeTruthy();
  });

  it('menandai kolom yang sudah tidak dikenal', () => {
    render(<Terkendali awal="qty_masuk - kolom_hilang" onUbah={vi.fn()} />);

    // Sisa rumus lama yang kolomnya sudah dihapus harus terlihat, bukan diam.
    expect(screen.getByText('kolom_hilang')).toBeTruthy();
  });

  it('menyediakan jalan keluar untuk menulis manual', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali onUbah={vi.fn()} />);

    await pengguna.click(screen.getByRole('button', { name: /Tulis manual/i }));

    expect(screen.getByPlaceholderText('qty_masuk - qty_keluar')).toBeTruthy();
  });
});
