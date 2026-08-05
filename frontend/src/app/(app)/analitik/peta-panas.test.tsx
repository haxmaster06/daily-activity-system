import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { BarisPetaPanas } from '@/lib/analitik';
import { PetaPanas } from './peta-panas';

const TANGGAL = ['2026-08-03', '2026-08-04', '2026-08-05'];

const BARIS: BarisPetaPanas[] = [
  {
    departemen_id: 1,
    departemen: 'Produksi',
    anggota: 4,
    sel: [
      { tanggal: '2026-08-03', melapor: 4, persen: 100 },
      { tanggal: '2026-08-04', melapor: 0, persen: 0 },
      { tanggal: '2026-08-05', melapor: 2, persen: 50 },
    ],
  },
  {
    departemen_id: 2,
    departemen: 'Quality Control',
    anggota: 2,
    sel: [
      { tanggal: '2026-08-03', melapor: 2, persen: 100 },
      { tanggal: '2026-08-04', melapor: 2, persen: 100 },
      { tanggal: '2026-08-05', melapor: 2, persen: 100 },
    ],
  },
];

function render_(baris = BARIS) {
  return render(
    <TooltipProvider>
      <PetaPanas tanggal={TANGGAL} baris={baris} />
    </TooltipProvider>,
  );
}

/**
 * Peta panas yang hanya berupa kotak berwarna tidak dapat dibaca sama sekali
 * oleh pembaca layar — masalah yang persis sama dengan grafik kanvas.
 *
 * Karena itu bentuknya `<table>` sungguhan: tiap sel membawa teksnya, dan
 * warnanya hanya mempercepat pembacaan bagi yang melihatnya.
 */
describe('terbaca tanpa melihat warnanya', () => {
  it('memakai tabel dengan judul baris dan kolom', () => {
    render_();

    const tabel = screen.getByRole('table');

    expect(within(tabel).getByRole('columnheader', { name: 'Departemen' })).toBeInTheDocument();
    expect(within(tabel).getByRole('rowheader', { name: /Produksi/ })).toBeInTheDocument();
  });

  it('menyebutkan angka tiap sel sebagai teks, bukan hanya warna', () => {
    render_();

    // Warna boleh hilang seluruhnya; isinya tetap terbaca.
    expect(screen.getByText('3 Agu 2026: 4 dari 4 melapor')).toBeInTheDocument();
    expect(screen.getByText('4 Agu 2026: 0 dari 4 melapor')).toBeInTheDocument();
  });

  it('menjelaskan arti warnanya lewat keterangan bertulisan', () => {
    render_();

    expect(screen.getByText('Tidak ada')).toBeInTheDocument();
    expect(screen.getByText('Semua')).toBeInTheDocument();
  });
});

describe('bentuk peta', () => {
  it('membuat satu sel untuk tiap pasangan departemen dan hari', () => {
    const { container } = render_();

    // Dua departemen kali tiga hari, ditambah judul barisnya.
    expect(container.querySelectorAll('tbody td')).toHaveLength(6);
  });

  it('menyebutkan jumlah anggota di samping nama departemennya', () => {
    render_();

    expect(screen.getByRole('rowheader', { name: 'Produksi (4)' })).toBeInTheDocument();
  });

  it('menampilkan pesan yang menjelaskan saat tidak ada anggota', () => {
    render_([]);

    expect(
      screen.getByText('Belum ada anggota yang wajib melapor pada penyaringan ini.'),
    ).toBeInTheDocument();
  });
});
