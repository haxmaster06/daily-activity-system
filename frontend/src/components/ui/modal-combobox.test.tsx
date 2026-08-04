import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import { Combobox, type OpsiCombobox } from './combobox';
import { Modal } from './modal';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const OPSI: OpsiCombobox[] = [
  { id: 1, label: 'Pemasok Alfa', keterangan: 'SUP_001' },
  { id: 2, label: 'Pemasok Beta', keterangan: 'SUP_002' },
];

function ModalDenganCombobox() {
  const [terbuka, setTerbuka] = useState(true);
  const [nilai, setNilai] = useState<OpsiCombobox | null>(null);

  return (
    <Modal terbuka={terbuka} onTutup={() => setTerbuka(false)} judul="Tambah Data">
      <Combobox label="Pemasok" opsi={OPSI} nilai={nilai} onUbah={setNilai} />
    </Modal>
  );
}

/*
 * Regresi yang sudah pernah terjadi pada Select: daftar pilihan yang di-portal
 * ke `document.body` terbaca sebagai klik di luar modal, dan modalnya menutup
 * dirinya sendiri sebelum pilihan sempat dipilih.
 *
 * Combobox memakai React Aria, bukan Radix, sehingga popover-nya terdaftar pada
 * susunan overlay yang sama dengan modalnya. Itu dugaan, dan dugaan tentang
 * overlay sudah pernah salah di project ini — karena itu diperiksa di sini,
 * sebelum Combobox dipakai di dalam modal.
 *
 * Daftar dibuka lewat fokus (`menuTrigger="focus"`), bukan lewat tombol panah:
 * itu jalur yang benar-benar ditempuh pengguna, dan nama aksesibel tombol
 * panahnya ditentukan React Aria sendiri.
 */
describe('Combobox di dalam Modal', () => {
  it('tidak menutup modal saat daftar pilihan terbuka', async () => {
    const user = userEvent.setup();
    render(<ModalDenganCombobox />);

    await user.click(await screen.findByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('memilih satu isi daftar tanpa menutup modal', async () => {
    const user = userEvent.setup();
    render(<ModalDenganCombobox />);

    await user.click(await screen.findByRole('combobox'));
    const daftar = await screen.findByRole('listbox');

    await user.click(within(daftar).getByRole('option', { name: /Pemasok Beta/ }));

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Pemasok Beta'));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  /*
   * Komponen ini sengaja tidak menyaring sendiri — penyaringan dikerjakan
   * server. Yang harus dijamin: apa yang diketik benar-benar sampai ke
   * pemanggil, karena tanpa itu tidak ada yang bisa memintanya ke server.
   *
   * Sebelum ada uji ini, `Combobox` tidak punya jalan sama sekali untuk
   * memberi tahu pemanggil apa yang sedang diketik. Tidak ada yang menyadarinya
   * karena komponennya belum pernah dipakai satu kali pun.
   */
  it('meneruskan ketikan ke pemanggil untuk disaring server', async () => {
    const user = userEvent.setup();
    const diketik: string[] = [];

    function Bungkus() {
      const [nilai, setNilai] = useState<OpsiCombobox | null>(null);

      return (
        <Modal terbuka onTutup={() => {}} judul="Tambah Data">
          <Combobox
            label="Pemasok"
            opsi={OPSI}
            nilai={nilai}
            onUbah={setNilai}
            onKetik={(teks) => diketik.push(teks)}
          />
        </Modal>
      );
    }

    render(<Bungkus />);

    await user.type(await screen.findByRole('combobox'), 'Bet');

    expect(diketik.at(-1)).toBe('Bet');
  });

  it('menampilkan hanya pilihan yang dikirim pemanggil', async () => {
    const user = userEvent.setup();

    function Bungkus() {
      const [nilai, setNilai] = useState<OpsiCombobox | null>(null);

      // Meniru hasil server: hanya satu baris yang cocok.
      return (
        <Modal terbuka onTutup={() => {}} judul="Tambah Data">
          <Combobox label="Pemasok" opsi={[OPSI[1]]} nilai={nilai} onUbah={setNilai} />
        </Modal>
      );
    }

    render(<Bungkus />);

    await user.click(await screen.findByRole('combobox'));
    const daftar = await screen.findByRole('listbox');

    expect(within(daftar).queryByRole('option', { name: /Pemasok Alfa/ })).toBeNull();
    expect(within(daftar).getByRole('option', { name: /Pemasok Beta/ })).toBeInTheDocument();
  });
});
