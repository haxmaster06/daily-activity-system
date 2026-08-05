import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PemotongFoto } from './pemotong-foto';

/*
 * `react-easy-crop` diganti boneka.
 *
 * Pustaka itu mengukur elemennya lewat `getBoundingClientRect`, dan jsdom
 * mengembalikan nol untuk semuanya — pemotongnya tidak pernah selesai
 * menghitung, sehingga merendernya sungguhan hanya menguji jsdom.
 *
 * Batas yang benar memang di sini: perhitungan potongan adalah tanggung jawab
 * pustakanya, sedangkan yang menjadi tanggung jawab berkas ini adalah apa yang
 * **dilakukan** dengan hasil hitungan itu — digambar ke kanvas, diserahkan ke
 * pemanggilnya — dan bahwa geserannya dapat diubah tanpa tetikus.
 */
const crop = vi.hoisted(() => ({ terakhir: { x: 0, y: 0 } }));

vi.mock('react-easy-crop', () => ({
  default: ({
    crop: posisi,
    onCropComplete,
  }: {
    crop: { x: number; y: number };
    onCropComplete: (persen: unknown, piksel: unknown) => void;
  }) => {
    crop.terakhir = posisi;

    return (
      <button
        type="button"
        onClick={() =>
          onCropComplete({}, { x: 10, y: 20, width: 400, height: 400 })
        }
      >
        selesai memotong
      </button>
    );
  },
}));

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }),
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: (selesai: (hasil: Blob | null) => void) =>
      selesai(new Blob(['x'], { type: 'image/jpeg' })),
  });

  // Gambar apa pun langsung "selesai dimuat" dengan ukuran yang masuk akal.
  class GambarPalsu {
    onload: (() => void) | null = null;
    width = 1200;
    height = 800;
    #src = '';

    set src(nilai: string) {
      this.#src = nilai;
      queueMicrotask(() => this.onload?.());
    }

    get src() {
      return this.#src;
    }
  }

  vi.stubGlobal('Image', GambarPalsu);

  URL.createObjectURL = vi.fn(() => 'blob:contoh');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  crop.terakhir = { x: 0, y: 0 };
});

function berkasContoh() {
  return new File(['isi'], 'foto.jpg', { type: 'image/jpeg' });
}

describe('memotong foto sebelum disimpan', () => {
  /*
   * Yang dikirim ke server adalah hasil potongan, bukan berkas aslinya —
   * itulah yang membuat pemotong ini berarti. Bila hasilnya tidak pernah
   * sampai, tombol Simpan tetap mengirim gambar utuh, dan tidak ada yang
   * terlihat salah sampai fotonya tersimpan.
   */
  it('menyerahkan hasil potongan kepada pemanggilnya', async () => {
    const onSiap = vi.fn();
    render(<PemotongFoto berkas={berkasContoh()} onSiap={onSiap} />);

    fireEvent.click(await screen.findByRole('button', { name: 'selesai memotong' }));

    await waitFor(() => {
      expect(onSiap).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  /*
   * Bagian gambar yang dipakai adalah keputusan yang tidak dapat diwakilkan,
   * dan pustakanya sendiri hanya menerima seret serta cubit. Tanpa jalur papan
   * ketik, pemotong ini tidak dapat dijalankan sebagian pengguna sama sekali.
   */
  it('menggeser potongannya dengan tombol panah', async () => {
    render(<PemotongFoto berkas={berkasContoh()} onSiap={vi.fn()} />);

    await screen.findByRole('button', { name: 'selesai memotong' });

    const jendela = screen.getByRole('application', {
      name: 'Geser foto untuk memilih bagian yang dipakai',
    });

    fireEvent.keyDown(jendela, { key: 'ArrowRight' });
    await waitFor(() => expect(crop.terakhir.x).toBeGreaterThan(0));

    const sesudahKanan = crop.terakhir.x;

    fireEvent.keyDown(jendela, { key: 'ArrowDown' });
    await waitFor(() => expect(crop.terakhir.y).toBeGreaterThan(0));

    // Sumbu yang tidak ditekan tidak ikut bergeser.
    expect(crop.terakhir.x).toBe(sesudahKanan);
  });

  it('menyediakan pengatur perbesaran', async () => {
    render(<PemotongFoto berkas={berkasContoh()} onSiap={vi.fn()} />);

    expect(
      await screen.findByRole('slider', { name: 'Perbesaran foto' }),
    ).toBeInTheDocument();
  });
});
