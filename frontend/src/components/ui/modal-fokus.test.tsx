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

function FormDalamModal() {
  const [terbuka, setTerbuka] = useState(true);
  const [nama, setNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [departemen, setDepartemen] = useState('');

  return (
    <Modal
      terbuka={terbuka}
      onTutup={() => setTerbuka(false)}
      judul="Tambah Pengguna"
      aksi={<button type="submit">Simpan</button>}
    >
      <form>
        <label htmlFor="nama">Nama</label>
        <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} />

        <label htmlFor="ket">Keterangan</label>
        <input id="ket" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />

        <Select
          id="dep"
          label="Departemen"
          nilai={departemen}
          onUbah={setDepartemen}
          opsi={[
            { nilai: 'produksi', label: 'Produksi' },
            { nilai: 'qa', label: 'QA' },
          ]}
        />

        <p data-testid="area-kosong">Area kosong di dalam dialog</p>
      </form>
    </Modal>
  );
}

function dialogAda(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}

describe('Modal tetap terbuka saat berinteraksi di dalamnya', () => {
  it('tidak menutup saat mengetik lalu mengklik area kosong', async () => {
    const user = userEvent.setup();
    render(<FormDalamModal />);

    await user.click(screen.getByLabelText('Nama'));
    await user.keyboard('Produksi');

    await user.click(screen.getByTestId('area-kosong'));

    expect(dialogAda()).toBe(true);
  });

  it('tidak menutup saat berpindah antar isian', async () => {
    const user = userEvent.setup();
    render(<FormDalamModal />);

    await user.click(screen.getByLabelText('Nama'));
    await user.keyboard('Uji');
    await user.click(screen.getByLabelText('Keterangan'));
    await user.keyboard('Keterangan uji');
    await user.click(screen.getByLabelText('Nama'));

    expect(dialogAda()).toBe(true);
  });

  /*
   * Urutan yang dilaporkan: buka daftar pilihan, tutup lagi, lalu klik di
   * dalam dialog. Radix memasang dan melepas lapisan overlay-nya sendiri di
   * sini, dan itulah yang sempat membuat modal ikut tertutup.
   */
  it('tidak menutup saat mengklik di dalam dialog setelah daftar pilihan ditutup', async () => {
    const user = userEvent.setup();
    render(<FormDalamModal />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    expect(dialogAda()).toBe(true);

    await user.click(screen.getByTestId('area-kosong'));
    expect(dialogAda()).toBe(true);

    await user.click(screen.getByLabelText('Nama'));
    expect(dialogAda()).toBe(true);
  });

  it('tidak menutup saat daftar pilihan ditutup dengan klik di area kosong', async () => {
    /*
     * Selama daftar terbuka, Radix memasang `pointer-events: none` pada
     * elemen di luarnya. Di peramban, klik tetap sampai ke pendengar dokumen
     * milik Radix dan membubarkan daftar. jsdom tidak menirukan itu, sehingga
     * pemeriksaan pointer-events dimatikan khusus untuk kasus ini.
     */
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<FormDalamModal />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    // Klik di dalam dialog untuk membubarkan daftar pilihan.
    await user.click(screen.getByTestId('area-kosong'));

    expect(dialogAda()).toBe(true);
  });

  it('menutup saat latar di belakang modal ditekan', async () => {
    const user = userEvent.setup();
    render(<FormDalamModal />);

    const dialog = document.querySelector('[role="dialog"]');
    // Latar adalah kakek dari dialog: overlay > modal > dialog.
    const latar = dialog!.parentElement!.parentElement!;

    await user.click(latar);

    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });

  it('tidak menutup saat memilih lalu mengklik isian lain', async () => {
    const user = userEvent.setup();
    render(<FormDalamModal />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    await user.click(screen.getByRole('option', { name: 'QA' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.click(screen.getByLabelText('Keterangan'));
    await user.keyboard('lanjut mengetik');

    expect(dialogAda()).toBe(true);
    expect(screen.getByLabelText('Keterangan')).toHaveValue('lanjut mengetik');
  });
});
