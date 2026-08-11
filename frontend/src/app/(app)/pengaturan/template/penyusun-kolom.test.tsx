import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import type { OpsiPenyusunKolom } from '@/lib/template';
import { KOLOM_KOSONG, PenyusunKolom, uidBaru, type DraftKolom } from './penyusun-kolom';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const OPSI: OpsiPenyusunKolom = { tipe: [], sumber_master: [] };

function draft(label: string, key: string): DraftKolom {
  return { ...KOLOM_KOSONG, uid: uidBaru(), label, key };
}

function Terkendali({
  awal,
  galatKolom = {},
}: {
  awal: DraftKolom[];
  galatKolom?: Record<string, string[]>;
}) {
  const [kolom, setKolom] = useState<DraftKolom[]>(awal);

  return (
    <PenyusunKolom
      kolom={kolom}
      onUbah={setKolom}
      opsi={OPSI}
      jenisMaster={[]}
      galatKolom={galatKolom}
    />
  );
}

/** Isian label pada panel kanan — satu-satunya yang dirender per waktu. */
function labelTerbuka(): HTMLInputElement {
  return screen.getByLabelText('Label yang dilihat pengguna') as HTMLInputElement;
}

describe('PenyusunKolom — dua panel', () => {
  it('hanya merender isian kolom yang sedang dipilih', () => {
    render(<Terkendali awal={[draft('Tanggal', 'tanggal'), draft('Berat', 'berat')]} />);

    // Dua baris di daftar kiri, tetapi hanya satu isian label di kanan.
    expect(screen.getAllByLabelText('Label yang dilihat pengguna')).toHaveLength(1);
    expect(labelTerbuka().value).toBe('Tanggal');
  });

  it('membuka kolom lain saat barisnya ditekan', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali awal={[draft('Tanggal', 'tanggal'), draft('Berat', 'berat')]} />);

    await pengguna.click(screen.getByText('Berat'));

    expect(labelTerbuka().value).toBe('Berat');
  });

  /*
   * Pilihan mengikuti kolomnya, bukan posisinya.
   *
   * Panel kanan menampilkan kolom pada indeks terpilih, jadi tanpa penyesuaian
   * di `pindah()` menaikkan sebuah kolom membuat panel kanan mendadak berisi
   * kolom lain — pengguna menyunting sesuatu yang bukan dipilihnya, dan tidak
   * ada yang memberitahunya.
   */
  it('tetap membuka kolom yang sama setelah urutannya berubah', async () => {
    const pengguna = userEvent.setup();
    render(
      <Terkendali
        awal={[draft('Tanggal', 'tanggal'), draft('Berat', 'berat'), draft('Shift', 'shift')]}
      />,
    );

    await pengguna.click(screen.getByText('Shift'));
    expect(labelTerbuka().value).toBe('Shift');

    await pengguna.click(screen.getByLabelText('Naikkan kolom 3'));

    expect(labelTerbuka().value).toBe('Shift');
  });

  it('mengembalikan kolom yang dihapus ke posisi semula', async () => {
    const pengguna = userEvent.setup();
    render(
      <Terkendali
        awal={[draft('Tanggal', 'tanggal'), draft('Berat', 'berat'), draft('Shift', 'shift')]}
      />,
    );

    await pengguna.click(screen.getByLabelText('Hapus kolom 2'));
    expect(screen.queryByText('Berat')).not.toBeInTheDocument();

    await pengguna.click(screen.getByRole('button', { name: /Batalkan/ }));

    // Kembali di tengah, bukan ditempel di akhir (§12.4).
    const baris = screen.getAllByRole('listitem');
    expect(baris[1]).toHaveTextContent('Berat');
  });

  it('menandai kolom yang ditolak server', () => {
    render(
      <Terkendali
        awal={[draft('Tanggal', 'tanggal'), draft('Berat', 'berat')]}
        galatKolom={{ 'fields.1.label': ['Label sudah dipakai.'] }}
      />,
    );

    const baris = screen.getAllByRole('listitem');
    expect(baris[1].querySelector('[aria-label="Kolom ini bermasalah"]')).not.toBeNull();
    expect(baris[0].querySelector('[aria-label="Kolom ini bermasalah"]')).toBeNull();
  });
});
