import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KolomPapan } from '@/lib/tugas';
import { PapanKanban } from './papan-kanban';

const geser = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('./actions', () => ({
  geserTugas: (...argumen: unknown[]) => geser(...argumen),
  hapusTugas: vi.fn(),
  buatTugas: vi.fn(),
  perbaruiTugas: vi.fn(),
}));

// Dialog tambah/ubah tidak diuji di sini; me-render seluruh isinya membawa
// DatePicker dan Combobox yang tidak ada hubungannya dengan perpindahan kartu.
vi.mock('./tugas-dialog', () => ({
  TugasDialog: () => null,
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

function papan(): KolomPapan[] {
  return [
    {
      status: 'belum_mulai',
      label: 'Belum Mulai',
      kartu: [
        {
          id: 7,
          judul: 'Menimbang bahan masuk',
          keterangan: null,
          status: 'belum_mulai',
          label_status: 'Belum Mulai',
          prioritas: 'sedang',
          label_prioritas: 'Sedang',
          target_selesai: null,
          lewat_target: false,
          urutan: 0,
          departemen: { id: 1, nama: 'Produksi' },
          penanggung_jawab: { id: 3, nama: 'Penanggung Jawab' },
          jumlah_laporan: 0,
        },
      ],
    },
    { status: 'dalam_proses', label: 'Dalam Proses', kartu: [] },
    { status: 'selesai', label: 'Selesai', kartu: [] },
  ];
}

function render_(bolehKelola = true) {
  return render(
    <PapanKanban
      kolomAwal={papan()}
      bolehKelola={bolehKelola}
      departemen={[{ nilai: '1', label: 'Produksi' }]}
      pengguna={[]}
      laporan={[]}
      departemenBawaan={1}
    />,
  );
}

beforeEach(() => {
  geser.mockReset();
  geser.mockResolvedValue({ berhasil: true, pesan: 'Tugas berhasil dipindahkan.' });
});

/**
 * Tarik-lepas tidak dapat menjadi satu-satunya cara memindahkan kartu.
 *
 * jsdom tidak punya tata letak, sehingga sensor papan ketik `@dnd-kit` tidak
 * dapat menghitung arah — tetapi itu bukan alasan test ini ada. Alasannya:
 * menyeret dengan papan ketik menuntut pengguna menahan model posisi di
 * kepalanya, dan pengguna pembaca layar tidak pernah melihat kursornya. Menu
 * "Pindahkan ke" menyebut kolom tujuannya dengan kata dan cukup satu penekanan.
 */
describe('perpindahan kartu tanpa tetikus', () => {
  it('memindahkan kartu antar kolom sepenuhnya lewat papan ketik', async () => {
    const pengguna = userEvent.setup();
    render_();

    /*
     * Menyusuri dengan Tab saja — tanpa satu pun klik tetikus. Urutannya:
     * tombol Tambah Tugas, pegangan seret kartu, lalu menu kelolanya. Pegangan
     * seret ikut terfokus karena `@dnd-kit` memang menjadikannya tombol; itu
     * memastikan jalur seret papan ketik tidak diam-diam hilang dari urutan
     * fokus.
     */
    await pengguna.tab();
    await pengguna.tab();
    expect(
      screen.getByRole('button', { name: 'Seret kartu Menimbang bahan masuk' }),
    ).toHaveFocus();

    await pengguna.tab();

    const kelola = screen.getByRole('button', { name: 'Kelola kartu Menimbang bahan masuk' });
    expect(kelola).toHaveFocus();

    await pengguna.keyboard('{Enter}');

    const menu = await screen.findByRole('menu');
    await pengguna.click(
      within(menu).getByRole('menuitem', { name: 'Pindahkan ke Selesai' }),
    );

    await waitFor(() => expect(geser).toHaveBeenCalledWith(7, 'selesai', 0));

    // Kartunya benar-benar pindah kolom di layar, bukan sekadar terkirim.
    const kolomSelesai = screen.getByRole('region', { name: /^Selesai/ });
    expect(within(kolomSelesai).getByText('Menimbang bahan masuk')).toBeInTheDocument();
  });

  it('mengembalikan kartu ke kolom asal saat server menolak', async () => {
    geser.mockResolvedValue({ berhasil: false, pesan: 'Tugas tersebut di luar jangkauan Anda.' });

    const pengguna = userEvent.setup();
    render_();

    await pengguna.click(
      screen.getByRole('button', { name: 'Kelola kartu Menimbang bahan masuk' }),
    );
    await pengguna.click(
      await screen.findByRole('menuitem', { name: 'Pindahkan ke Dalam Proses' }),
    );

    await screen.findByRole('alert');

    /*
     * Kartu yang tetap berada di kolom barunya padahal servernya menolak adalah
     * kebohongan yang paling mahal di papan ini: pengisinya mengira pekerjaan
     * itu sudah tercatat, dan tidak ada yang mengulanginya.
     */
    const kolomAsal = screen.getByRole('region', { name: /^Belum Mulai/ });
    expect(within(kolomAsal).getByText('Menimbang bahan masuk')).toBeInTheDocument();

    const kolomTujuan = screen.getByRole('region', { name: /^Dalam Proses/ });
    expect(within(kolomTujuan).queryByText('Menimbang bahan masuk')).not.toBeInTheDocument();
  });
});

describe('petunjuk pembaca layar', () => {
  /*
   * Inilah sebab `@dnd-kit` dipakai, bukan `useDragAndDrop` milik React Aria
   * yang sudah terpasang: kamus React Aria tidak memuat `id-ID`, sehingga
   * petunjuknya terucap dalam Bahasa Inggris. Test ini akan gagal bila suatu
   * saat papan dipindahkan ke React Aria tanpa menyelesaikan soal bahasanya.
   */
  it('menuliskan petunjuk papan ketik dalam Bahasa Indonesia', () => {
    render_();

    const petunjuk = screen.getByText(/Tekan spasi untuk mulai memindahkan kartu/);

    expect(petunjuk).toBeInTheDocument();
    expect(petunjuk.textContent).not.toMatch(/press|drag|drop/i);
  });
});

describe('tanpa izin mengelola', () => {
  it('tidak menawarkan perpindahan kartu', () => {
    render_(false);

    expect(screen.getByText('Menimbang bahan masuk')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Kelola kartu Menimbang bahan masuk' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tambah Tugas' }),
    ).not.toBeInTheDocument();
  });
});
