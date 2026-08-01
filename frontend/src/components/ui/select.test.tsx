import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import { Select } from './select';

/*
 * Radix Select memakai Pointer Events API yang belum lengkap di jsdom.
 * Tanpa penambal ini, membuka daftar pilihan melempar galat.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const BANYAK_OPSI = Array.from({ length: 20 }, (_, i) => ({
  nilai: `d${i + 1}`,
  label: `Departemen ${i + 1}`,
}));

function SelectUji({ opsi = BANYAK_OPSI }: { opsi?: typeof BANYAK_OPSI }) {
  const [nilai, setNilai] = useState('');

  return (
    <Select id="uji" label="Departemen" opsi={opsi} nilai={nilai} onUbah={setNilai} />
  );
}

describe('Select', () => {
  it('menampilkan seluruh pilihan saat daftar dibuka', async () => {
    const user = userEvent.setup();
    render(<SelectUji />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getAllByRole('option')).toHaveLength(20);
  });

  /*
   * Regresi: `overflow-hidden` sempat dipasang di Content sementara Viewport
   * tidak dapat digulir, sehingga pilihan di bawah terpotong dan tidak dapat
   * dijangkau sama sekali.
   */
  it('menjadikan viewport wadah gulir, bukan sekadar memotong isi', async () => {
    const user = userEvent.setup();
    const { container } = render(<SelectUji />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    const viewport = document.querySelector('[data-radix-select-viewport]');

    expect(viewport).not.toBeNull();
    expect(viewport!.className).toContain('overflow-y-auto');
    expect(viewport!.className).toMatch(/max-h-/);

    expect(container).toBeTruthy();
  });

  it('memilih salah satu pilihan lalu menutup daftar', async () => {
    const user = userEvent.setup();
    render(<SelectUji />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.click(screen.getByRole('option', { name: 'Departemen 12' }));

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox')).toHaveTextContent('Departemen 12');
  });

  it('menyambungkan pesan galat ke pemicunya', () => {
    render(
      <Select
        id="uji-galat"
        label="Departemen"
        opsi={BANYAK_OPSI}
        nilai=""
        onUbah={() => {}}
        galat="Departemen wajib dipilih."
      />,
    );

    const pemicu = screen.getByRole('combobox');

    expect(pemicu).toHaveAttribute('aria-invalid', 'true');
    expect(pemicu).toHaveAttribute('aria-describedby', 'uji-galat-galat');
    expect(screen.getByRole('alert')).toHaveTextContent('Departemen wajib dipilih.');
  });
});

describe('Select dengan nilai yang sudah terisi', () => {
  it('menampilkan label pilihan tanpa perlu membuka daftarnya', () => {
    render(
      <Select
        id="uji-terisi"
        label="Departemen"
        placeholder="Pilih departemen"
        opsi={BANYAK_OPSI}
        nilai="d7"
        onUbah={() => {}}
      />,
    );

    /*
     * Isian yang sedang disunting harus terbaca sejak dibuka. `Select.Value`
     * milik Radix mengambil teksnya dari Item yang sedang ter-mount, sedangkan
     * daftarnya baru dipasang ketika dibuka — labelnya dicari sendiri.
     */
    expect(screen.getByRole('combobox')).toHaveTextContent('Departemen 7');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('Pilih departemen');
  });

  it('mengabaikan nilai kosong yang datang dari Radix', async () => {
    /*
     * Radix memancarkan onValueChange('') sendiri ketika daftarnya di-mount
     * ulang — mis. saat portalnya dipindahkan ke dalam modal. Tanpa penjagaan,
     * nilai yang baru diisi program ikut terhapus dan isiannya terlihat kosong.
     */
    const diterima: string[] = [];

    render(
      <Select
        id="uji-reset"
        label="Departemen"
        opsi={BANYAK_OPSI}
        nilai="d3"
        onUbah={(nilai) => diterima.push(nilai)}
      />,
    );

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Departemen 3'));

    expect(diterima).not.toContain('');
  });
});
