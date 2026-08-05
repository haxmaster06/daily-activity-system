import { render, screen, within } from '@testing-library/react';
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
    tampilan: null,
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

describe('TabelIsian — mode per baris', () => {
  it('membuka satu baris sebagai form berisi seluruh kolom', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali />);

    await pengguna.click(screen.getByRole('button', { name: 'Buka baris 1 sebagai form' }));

    const panel = await screen.findByRole('dialog');

    expect(panel).toHaveTextContent('Baris 1 dari 1');
    // Seluruh kolom hadir, bukan hanya yang muat di layar.
    for (const label of ['No SPK', 'Qty', 'Catatan']) {
      expect(within(panel).getByText(label, { exact: false })).toBeInTheDocument();
    }
  });

  it('berpindah antar baris dari dalam panel', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali awal={[barisKosong(KOLOM), barisKosong(KOLOM)]} />);

    await pengguna.click(screen.getByRole('button', { name: 'Buka baris 1 sebagai form' }));
    await screen.findByRole('dialog');

    await pengguna.click(screen.getByRole('button', { name: 'Baris berikutnya' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Baris 2 dari 2');
  });

  it('menukar bentuk pengisian tanpa menghilangkan isian', async () => {
    const pengguna = userEvent.setup();
    render(<Terkendali awal={[{ no_spk: 'SPK-001', qty: 12, catatan: null }]} />);

    await pengguna.click(screen.getByRole('radio', { name: 'Per Baris' }));

    // Daftar ringkas menampilkan nilai yang sama.
    expect(screen.getByText('SPK-001', { exact: false })).toBeInTheDocument();

    await pengguna.click(screen.getByRole('radio', { name: 'Grid' }));

    expect(screen.getByLabelText('No SPK')).toHaveValue('SPK-001');
  });

  it('menandai baris yang masih bermasalah pada daftar ringkas', async () => {
    const pengguna = userEvent.setup();

    function DenganGalat() {
      const [baris, setBaris] = useState<NilaiBaris[]>([barisKosong(KOLOM)]);

      return (
        <TabelIsian
          kolom={KOLOM}
          baris={baris}
          onUbah={setBaris}
          awalanGalat="uji"
          galat={{ 'uji.0.no_spk': ['No SPK wajib diisi.'] }}
        />
      );
    }

    render(<DenganGalat />);
    await pengguna.click(screen.getByRole('radio', { name: 'Per Baris' }));

    // Validasi tidak boleh tersembunyi di balik panel (§2).
    expect(screen.getByLabelText('Baris ini masih bermasalah')).toBeInTheDocument();
  });
});

describe('TabelIsian — kolom bergrup', () => {
  const BERGRUP: KolomTemplate[] = [
    kolom('spk', 'No SPK'),
    kolom('pouch_isi', 'Isi', 'integer', { grup: 'Pouch' }),
    kolom('box_isi', 'Isi', 'integer', { grup: 'Box' }),
  ];

  function TerkendaliBergrup() {
    const [baris, setBaris] = useState<NilaiBaris[]>([barisKosong(BERGRUP)]);

    return (
      <TabelIsian kolom={BERGRUP} baris={baris} onUbah={setBaris} awalanGalat="uji" />
    );
  }

  /*
   * Dua kolom berlabel "Isi" milik grup berbeda. Di mode grid nama grupnya ada
   * pada header dua baris; di panel per baris ia harus dibawa serta, kalau
   * tidak pengisi tidak punya cara tahu isian mana milik grup mana.
   */
  it('menampilkan nama grup pada panel per baris', async () => {
    const pengguna = userEvent.setup();
    render(<TerkendaliBergrup />);

    await pengguna.click(screen.getByRole('button', { name: 'Buka baris 1 sebagai form' }));
    const panel = await screen.findByRole('dialog');

    expect(within(panel).getByRole('heading', { name: 'Pouch' })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Box' })).toBeInTheDocument();
  });
});

describe('TabelIsian — batalkan penghapusan', () => {
  /*
   * Baris dapat memuat belasan sel yang baru diketik. Menghapusnya tidak boleh
   * menjadi satu klik tanpa jalan kembali.
   */
  it('mengembalikan baris beserta isinya', async () => {
    const pengguna = userEvent.setup();
    render(
      <Terkendali
        awal={[
          { no_spk: 'SPK-001', qty: 10, catatan: null },
          { no_spk: 'SPK-002', qty: 20, catatan: null },
        ]}
      />,
    );

    await pengguna.click(screen.getByRole('button', { name: 'Hapus baris 2' }));

    expect(screen.getAllByRole('row')).toHaveLength(2); // header + satu baris

    await pengguna.click(screen.getByRole('button', { name: 'Batalkan' }));

    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByLabelText('No SPK')[1]).toHaveValue('SPK-002');
  });

  it('mengembalikan baris ke posisi semula, bukan ke akhir', async () => {
    const pengguna = userEvent.setup();
    render(
      <Terkendali
        awal={[
          { no_spk: 'A', qty: null, catatan: null },
          { no_spk: 'B', qty: null, catatan: null },
          { no_spk: 'C', qty: null, catatan: null },
        ]}
      />,
    );

    await pengguna.click(screen.getByRole('button', { name: 'Hapus baris 2' }));
    await pengguna.click(screen.getByRole('button', { name: 'Batalkan' }));

    // Urutan baris pada laporan punya arti bagi pengisinya.
    const isian = screen.getAllByLabelText('No SPK');
    expect(isian.map((i) => (i as HTMLInputElement).value)).toEqual(['A', 'B', 'C']);
  });
});
