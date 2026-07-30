import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import { Modal } from './modal';
import { Select } from './select';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const OPSI = [
  { nilai: 'produksi', label: 'Produksi' },
  { nilai: 'qa', label: 'QA' },
  { nilai: 'qc', label: 'QC' },
];

function ModalDenganSelect() {
  const [terbuka, setTerbuka] = useState(true);
  const [nilai, setNilai] = useState('');

  return (
    <Modal terbuka={terbuka} onTutup={() => setTerbuka(false)} judul="Tambah Pengguna">
      <Select id="departemen" label="Departemen" opsi={OPSI} nilai={nilai} onUbah={setNilai} />
    </Modal>
  );
}

describe('Select di dalam Modal', () => {
  /*
   * Regresi: Radix mem-portal daftar pilihan ke document.body, di luar DOM
   * modal React Aria. Modal `isDismissable` membaca klik di situ sebagai klik
   * di luar, lalu menutup dirinya sendiri — pilihan tidak pernah sempat
   * dipilih.
   */
  it('tidak menutup modal saat daftar pilihan dibuka', async () => {
    const user = userEvent.setup();
    render(<ModalDenganSelect />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    /*
     * Diperiksa lewat DOM, bukan getByRole: selama daftar Radix terbuka,
     * Radix memberi aria-hidden pada elemen di luarnya sehingga modal memang
     * hilang dari pohon aksesibilitas. Yang ingin dipastikan di sini adalah
     * modalnya tidak dilepas dari DOM.
     */
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('tidak menutup modal saat salah satu pilihan diklik', async () => {
    const user = userEvent.setup();
    render(<ModalDenganSelect />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.click(screen.getByRole('option', { name: 'QA' }));

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    // Modal tetap terbuka, dan pilihannya benar-benar tersimpan.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('QA');
  });

  it('menaruh daftar pilihan di dalam DOM modal, bukan di document.body', async () => {
    const user = userEvent.setup();
    render(<ModalDenganSelect />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    const dialog = document.querySelector('[role="dialog"]');
    const daftar = screen.getByRole('listbox');

    expect(dialog).not.toBeNull();

    // Inilah yang membuat kliknya tidak terbaca sebagai klik di luar modal:
    // daftar pilihan berada di dalam elemen modal, bukan di document.body.
    const elemenModal = dialog!.parentElement;
    expect(elemenModal?.contains(daftar)).toBe(true);
  });
});
