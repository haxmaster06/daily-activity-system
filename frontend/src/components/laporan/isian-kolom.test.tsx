import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { NilaiBaris, NilaiSel } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';
import { IsianKolom } from './isian-kolom';

function kolomTeks(sebagian: Partial<KolomTemplate> = {}): KolomTemplate {
  return {
    id: 1,
    kunci: 'lot',
    label: 'LOT#',
    tipe: 'text',
    grup: null,
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
    total: false,
    tampilan: null,
    ...sebagian,
  };
}

/*
 * LOT dulu bertipe `integer`, jadi angka nol di depan hilang ("007" -> 7).
 * LOT adalah penanda, bukan takaran; sebagai `text` nol di depannya harus utuh.
 */
describe('kolom penanda teks (mis. LOT)', () => {
  it('mempertahankan angka nol di depan yang diketik', async () => {
    // Wadah berstatus supaya ketikan menumpuk seperti pada form sungguhan.
    function Wadah() {
      const [nilai, setNilai] = useState<NilaiBaris>({});

      return (
        <IsianKolom
          kolom={kolomTeks()}
          nilai={nilai}
          onUbah={(kunci: string, isi: NilaiSel) => setNilai((n) => ({ ...n, [kunci]: isi }))}
          idBaris="b1"
        />
      );
    }

    const pengguna = userEvent.setup();
    render(<Wadah />);

    await pengguna.type(screen.getByRole('textbox', { name: 'LOT#' }), '007');

    // Nilainya tetap "007" apa adanya — bukan angka 7.
    expect(screen.getByRole('textbox', { name: 'LOT#' })).toHaveValue('007');
  });

  it('menampilkan nilai lama yang tersimpan sebagai angka', () => {
    // Laporan lama menyimpan LOT sebagai number saat kolomnya masih `integer`.
    render(
      <IsianKolom
        kolom={kolomTeks()}
        nilai={{ lot: 12345 as unknown as string }}
        onUbah={vi.fn()}
        idBaris="b1"
      />,
    );

    expect(screen.getByRole('textbox', { name: 'LOT#' })).toHaveValue('12345');
  });
});
