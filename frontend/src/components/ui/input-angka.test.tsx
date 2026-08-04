import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InputAngka } from './input-angka';

/**
 * Pembungkus berstatus.
 *
 * `InputAngka` terkendali penuh — nilainya datang dari pemanggil. Merendernya
 * dengan nilai tetap akan menguji sesuatu yang tidak pernah terjadi di
 * aplikasi, karena di sana isian selalu dikembalikan ke komponen.
 */
function Terkendali({
  awal = null,
  desimal = 2,
  bulat = false,
  onUbah,
  label = 'Berat bersih',
}: {
  awal?: number | null;
  desimal?: number;
  bulat?: boolean;
  onUbah: (nilai: number | null) => void;
  label?: string;
}) {
  const [nilai, setNilai] = useState<number | null>(awal);

  return (
    <InputAngka
      nilai={nilai}
      onUbah={(baru) => {
        setNilai(baru);
        onUbah(baru);
      }}
      desimal={desimal}
      bulat={bulat}
      label={label}
    />
  );
}

/**
 * Uji ini ada karena satu cacat yang nyata.
 *
 * Pendahulunya memakai `<input type="number">` terkendali dengan `Number()`
 * pada tiap ketikan, sehingga mengetik `12,` membuat nilainya runtuh menjadi
 * `12` dan komanya hilang sebelum angka berikutnya sempat masuk. Mengisi 12,75
 * praktis mustahil, dan tidak ada satu pun test yang menangkapnya.
 */
describe('InputAngka', () => {
  function pasang(awal: number | null = null, desimal = 2) {
    const onUbah = vi.fn();
    render(<Terkendali awal={awal} desimal={desimal} onUbah={onUbah} />);

    return { onUbah, isian: screen.getByLabelText('Berat bersih') };
  }

  it('membiarkan koma diketik sampai selesai', async () => {
    const pengguna = userEvent.setup();
    const { onUbah, isian } = pasang();

    await pengguna.type(isian, '12,75');

    // Yang menentukan: komanya masih ada di layar, tidak runtuh saat diketik.
    expect(isian).toHaveValue('12,75');
    expect(onUbah).not.toHaveBeenCalled();

    await pengguna.tab();

    expect(onUbah).toHaveBeenCalledTimes(1);
    expect(onUbah).toHaveBeenCalledWith(12.75);
  });

  it('menerima titik dari papan angka', async () => {
    const pengguna = userEvent.setup();
    const { onUbah, isian } = pasang();

    await pengguna.type(isian, '0.5');
    await pengguna.tab();

    expect(onUbah).toHaveBeenCalledWith(0.5);
  });

  it('menuliskan kembali nilainya dengan pemisah Indonesia', async () => {
    const pengguna = userEvent.setup();
    const { isian } = pasang();

    await pengguna.type(isian, '1234.5');
    await pengguna.tab();

    // Pengguna harus melihat angka mana yang dipahami sistem. Inilah yang
    // membuat salah tafsir ketahuan saat itu juga.
    expect(isian).toHaveValue('1.234,50');
  });

  it('membulatkan pada kolom bilangan bulat', async () => {
    const onUbah = vi.fn();
    const pengguna = userEvent.setup();
    render(<Terkendali bulat desimal={0} onUbah={onUbah} label="Jumlah" />);

    await pengguna.type(screen.getByLabelText('Jumlah'), '12,6');
    await pengguna.tab();

    expect(onUbah).toHaveBeenCalledWith(13);
  });

  it('mengosongkan nilai ketika isiannya dikosongkan', async () => {
    const pengguna = userEvent.setup();
    const { onUbah, isian } = pasang(9);

    await pengguna.clear(isian);
    await pengguna.tab();

    expect(onUbah).toHaveBeenCalledWith(null);
  });

  it('tidak memberi tahu pemanggil ketika nilainya tidak berubah', async () => {
    const pengguna = userEvent.setup();
    const { onUbah, isian } = pasang(12.75);

    await pengguna.click(isian);
    await pengguna.tab();

    expect(onUbah).not.toHaveBeenCalled();
  });

  it('menampilkan nilai awal dalam bentuk terformat', () => {
    const { isian } = pasang(1234.5);

    expect(isian).toHaveValue('1.234,50');
  });
});
