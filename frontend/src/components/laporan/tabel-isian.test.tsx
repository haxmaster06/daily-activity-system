import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import { barisKosong, type NilaiBaris } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';
import { TabelIsian } from './tabel-isian';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

function kolom(
  kunci: string,
  label: string,
  tipe: KolomTemplate['tipe'] = 'text',
  tambahan: Partial<KolomTemplate> = {},
): KolomTemplate {
  return {
    id: Math.floor(Math.random() * 100_000),
    kunci,
    label,
    grup: null,
    tipe,
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
    desimal: null,
    master_jenis_id: null,
    master_jenis: null,
    master_induk_kunci: null,
    beku: false,
    ...tambahan,
  };
}

const KOLOM: KolomTemplate[] = [
  kolom('no_spk', 'No SPK', 'text', { beku: true }),
  kolom('qty', 'Qty', 'integer'),
  kolom('catatan', 'Catatan', 'text'),
];

function Terkendali({ awal }: { awal?: NilaiBaris[] }) {
  const [baris, setBaris] = useState<NilaiBaris[]>(awal ?? [barisKosong(KOLOM)]);

  return (
    <TabelIsian kolom={KOLOM} baris={baris} onUbah={setBaris} awalanGalat="uji" />
  );
}

describe('TabelIsian', () => {
  it('membekukan kolom yang ditandai, bukan seluruhnya', () => {
    render(<Terkendali />);

    const header = screen.getByRole('columnheader', { name: /No SPK/ });
    const biasa = screen.getByRole('columnheader', { name: /Catatan/ });

    expect(header.className).toContain('sticky');
    expect(biasa.className).not.toContain('sticky');
  });

  it('menambah baris lewat tombolnya', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali />);

    expect(screen.getAllByRole('row')).toHaveLength(2); // header + satu baris

    await pengguna.click(screen.getByRole('button', { name: 'Tambah Baris' }));

    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  /*
   * Inti dari "harus lebih unggul daripada Excel": satu baris penuh dapat diisi
   * tanpa menyentuh tetikus sama sekali.
   */
  it('memindahkan fokus turun satu baris saat Enter ditekan', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali awal={[barisKosong(KOLOM), barisKosong(KOLOM)]} />);

    const isian = screen.getAllByLabelText('No SPK');
    isian[0].focus();

    await pengguna.keyboard('{Enter}');

    expect(document.activeElement).toBe(isian[1]);
  });

  it('menambah baris baru saat Enter ditekan pada baris terakhir', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali />);

    screen.getByLabelText('No SPK').focus();
    await pengguna.keyboard('{Enter}');

    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('berpindah sel dengan Alt dan panah', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali />);

    const spk = screen.getByLabelText('No SPK');
    spk.focus();

    await pengguna.keyboard('{Alt>}{ArrowRight}{/Alt}');

    expect(document.activeElement).toBe(screen.getByLabelText('Qty'));

    await pengguna.keyboard('{Alt>}{ArrowLeft}{/Alt}');

    expect(document.activeElement).toBe(spk);
  });

  /*
   * Panah polos milik kontrolnya sendiri. Mengambil alihnya akan merusak Select
   * dan Combobox, yang memakai panah untuk berpindah pilihan.
   */
  it('tidak memindahkan sel ketika panah ditekan tanpa Alt', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali />);

    const spk = screen.getByLabelText('No SPK');
    spk.focus();

    await pengguna.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(spk);
  });

  it('menghapus baris lewat ikonnya, dan menahan baris terakhir', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali awal={[barisKosong(KOLOM), barisKosong(KOLOM)]} />);

    await pengguna.click(screen.getByRole('button', { name: 'Hapus baris 2' }));

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Hapus baris 1' })).toBeDisabled();
  });
});
