import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoncengNotifikasi } from './lonceng-notifikasi';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Reverb tidak ada di dalam test; loncengnya harus tetap bekerja tanpanya.
vi.mock('@/lib/echo', () => ({ echoDams: () => null }));

const KOTAK = {
  jumlah_belum_dibaca: 1,
  daftar: [
    {
      id: 'a1',
      jenis: 'laporan_dikirim',
      judul: 'Laporan baru',
      pesan: 'Produksi mengirim laporan.',
      tautan: '/laporan/1',
      dibaca: false,
      waktu: '2026-08-05T08:00:00+07:00',
    },
    {
      id: 'b2',
      jenis: 'umum',
      judul: 'Sudah dibaca',
      pesan: 'Notifikasi lama.',
      tautan: null,
      dibaca: true,
      waktu: '2026-08-04T08:00:00+07:00',
    },
  ],
};

const permintaan: { alamat: string; isi: unknown }[] = [];

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  permintaan.length = 0;

  vi.stubGlobal('fetch', (alamat: string, opsi?: RequestInit) => {
    permintaan.push({
      alamat,
      isi: opsi?.body ? JSON.parse(String(opsi.body)) : null,
    });

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(KOTAK),
    } as Response);
  });
});

async function bukaLonceng() {
  const pengguna = userEvent.setup();
  render(<LoncengNotifikasi penggunaId={7} />);

  await waitFor(() => expect(screen.getByRole('button', { name: /Notifikasi/ })).toBeEnabled());
  await pengguna.click(screen.getByRole('button', { name: /Notifikasi/ }));

  return pengguna;
}

describe('menghapus notifikasi', () => {
  /*
   * Tombol hapus berada di luar menu item Radix. Di dalamnya, penekanannya
   * ditangkap `onSelect` milik menu item — notifikasinya terbuka, dan tidak ada
   * yang terhapus.
   */
  it('menghapus satu notifikasi tanpa membuka tautannya', async () => {
    const pengguna = await bukaLonceng();

    await pengguna.click(
      await screen.findByRole('button', { name: 'Hapus notifikasi Laporan baru' }),
    );

    await waitFor(() => {
      expect(permintaan.some((satu) => satu.alamat === '/api/notifikasi/hapus')).toBe(true);
    });

    const hapus = permintaan.find((satu) => satu.alamat === '/api/notifikasi/hapus');

    expect(hapus?.isi).toEqual({ id: 'a1' });
  });

  /*
   * Membersihkan hanya membuang yang sudah dibaca. Menghapus seluruhnya
   * sekaligus berarti membuang pemberitahuan yang belum sempat dilihat, tanpa
   * jalan mengembalikannya.
   */
  it('membersihkan tanpa menyertakan yang belum dibaca', async () => {
    const pengguna = await bukaLonceng();

    await pengguna.click(await screen.findByRole('menuitem', { name: /Bersihkan/ }));

    await waitFor(() => {
      expect(permintaan.some((satu) => satu.alamat === '/api/notifikasi/hapus')).toBe(true);
    });

    const bersih = permintaan.find((satu) => satu.alamat === '/api/notifikasi/hapus');

    expect(bersih?.isi).toEqual({ bersihkan: true });
  });

  it('tidak menawarkan Bersihkan saat tidak ada yang sudah dibaca', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jumlah_belum_dibaca: 1,
            daftar: [KOTAK.daftar[0]],
          }),
      } as Response),
    );

    const pengguna = await bukaLonceng();

    await screen.findByText('Laporan baru');

    expect(screen.queryByRole('menuitem', { name: /Bersihkan/ })).not.toBeInTheDocument();
  });
});
