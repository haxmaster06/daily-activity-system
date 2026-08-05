import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DataAnalitik } from '@/lib/analitik';
import { PapanAnalitik } from './papan-analitik';

/*
 * Grafiknya diganti boneka. Chart.js menggambar ke `<canvas>`, dan jsdom tidak
 * menyediakan konteks gambar sama sekali — merendernya sungguhan hanya
 * menghasilkan galat yang tidak ada hubungannya dengan yang diuji di sini.
 *
 * Yang diuji memang bukan gambarnya, melainkan bahwa tiap grafik disertai tabel
 * berisi angka yang sama. Boneka ini mencatat data yang diterimanya sehingga
 * keduanya dapat dibandingkan.
 */
const dataGrafik: Record<string, unknown> = {};

function boneka(nama: string) {
  return function Boneka({ data }: { data: unknown }) {
    dataGrafik[nama] = data;

    return <div data-testid="grafik" data-nama={nama} />;
  };
}

vi.mock('./grafik', () => ({
  GrafikStatusDepartemen: boneka('status-departemen'),
  GrafikKepatuhan: boneka('kepatuhan'),
  GrafikSebaranStatus: boneka('sebaran-status'),
  GrafikBeban: boneka('beban'),
}));

const CONTOH: DataAnalitik = {
  rentang: { dari: '2026-07-07', sampai: '2026-08-05', hari: 30 },
  status_per_departemen: [
    { departemen: 'Produksi', belum_mulai: 4, dalam_proses: 7, selesai: 12 },
    { departemen: 'Quality Control', belum_mulai: 1, dalam_proses: 0, selesai: 3 },
  ],
  kepatuhan: [
    { tanggal: '2026-08-04', melapor: 8, wajib: 10 },
    { tanggal: '2026-08-05', melapor: 9, wajib: 10 },
  ],
  sebaran_status_baris: [
    { status: 'belum_mulai', label: 'Belum Mulai', jumlah: 5 },
    { status: 'dalam_proses', label: 'Dalam Proses', jumlah: 6 },
    { status: 'selesai', label: 'Selesai', jumlah: 21 },
  ],
  beban_penanggung_jawab: [
    { nama: 'Penanggung Jawab Satu', berjalan: 11, selesai: 2 },
    { nama: 'Belum ditentukan', berjalan: 3, selesai: 0 },
  ],
  lewat_target: [
    {
      id: 5,
      judul: 'Kalibrasi timbangan',
      status: 'dalam_proses',
      label_status: 'Dalam Proses',
      departemen: 'Produksi',
      penanggung_jawab: 'Penanggung Jawab Satu',
      target_selesai: '2026-08-01',
      telat_hari: 4,
    },
  ],
};

/**
 * Syarat kelulusan yang lahir dari pilihan memakai Chart.js.
 *
 * Kanvas hanya satu elemen DOM: tidak ada titik data yang dapat difokus papan
 * ketik, dan pembaca layar tidak menemukan apa pun di dalamnya. Tabel angka
 * adalah satu-satunya jalan isi grafik sampai ke pembacanya, sehingga
 * keberadaannya diperiksa sebagai aturan — bukan diingat saat menambah grafik
 * berikutnya.
 */
describe('tabel pendamping wajib', () => {
  it('menyertakan tabel di dalam panel yang sama dengan tiap grafik', () => {
    const { container } = render(<PapanAnalitik data={CONTOH} />);

    const grafik = screen.getAllByTestId('grafik');
    expect(grafik).toHaveLength(4);

    for (const satu of grafik) {
      const panel = satu.closest('section');

      expect(panel, `grafik ${satu.dataset.nama} tidak berada di dalam panel`).not.toBeNull();
      expect(
        panel?.querySelector('table'),
        `grafik ${satu.dataset.nama} tidak punya tabel pendamping`,
      ).not.toBeNull();
    }

    // Termasuk tabel "melewati target" yang memang tidak bergrafik.
    expect(container.querySelectorAll('table')).toHaveLength(5);
  });
});

describe('angka tabel sama dengan angka grafik', () => {
  it('menampilkan sebaran kartu per departemen apa adanya', () => {
    render(<PapanAnalitik data={CONTOH} />);

    expect(dataGrafik['status-departemen']).toBe(CONTOH.status_per_departemen);

    const panel = screen.getByText('Kartu Progres per Departemen').closest('section');
    const baris = within(panel as HTMLElement).getByText('Produksi').closest('tr');

    // 4 belum mulai, 7 dalam proses, 12 selesai — persis yang masuk ke grafik.
    expect(within(baris as HTMLElement).getByText('4')).toBeInTheDocument();
    expect(within(baris as HTMLElement).getByText('7')).toBeInTheDocument();
    expect(within(baris as HTMLElement).getByText('12')).toBeInTheDocument();
  });

  it('menghitung persentase kepatuhan dari angka yang sama', () => {
    render(<PapanAnalitik data={CONTOH} />);

    expect(dataGrafik['kepatuhan']).toBe(CONTOH.kepatuhan);

    const panel = screen.getByText('Kepatuhan Laporan Harian').closest('section');
    const teks = (panel as HTMLElement).textContent ?? '';

    // 9 dari 10 = 90%, 8 dari 10 = 80%.
    expect(teks).toContain('90%');
    expect(teks).toContain('80%');
  });

  it('menampilkan sebaran status baris dan beban dengan angka yang sama', () => {
    render(<PapanAnalitik data={CONTOH} />);

    expect(dataGrafik['sebaran-status']).toBe(CONTOH.sebaran_status_baris);
    expect(dataGrafik['beban']).toBe(CONTOH.beban_penanggung_jawab);

    const sebaran = screen.getByText('Sebaran Status Baris Laporan').closest('section');
    expect((sebaran as HTMLElement).textContent).toContain('21');

    const beban = screen.getByText('Beban per Penanggung Jawab').closest('section');
    expect((beban as HTMLElement).textContent).toContain('11');
    // Kartu tanpa penanggung jawab tidak dibuang — justru itu yang perlu
    // terbaca pembaca halaman ini.
    expect((beban as HTMLElement).textContent).toContain('Belum ditentukan');
  });
});

describe('rincian departemen', () => {
  /*
   * Batang grafik dapat diklik, tetapi kanvas tidak dapat difokus papan ketik
   * sama sekali. Tanpa tombol di tabelnya, rincian departemen hanya terbuka
   * bagi pengguna tetikus — persis pembagian yang hendak dihindari dengan
   * mewajibkan tabel pendamping.
   */
  it('terbuka dari nama departemen pada tabel, tanpa menyentuh grafik', async () => {
    const pengguna = userEvent.setup();
    render(<PapanAnalitik data={CONTOH} />);

    await pengguna.click(screen.getByRole('button', { name: 'Produksi' }));

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Produksi')).toBeInTheDocument();
    expect(within(dialog).getByText('12')).toBeInTheDocument();
  });
});

describe('kartu melewati target', () => {
  it('menyebut nama, departemen, dan berapa hari telatnya', () => {
    render(<PapanAnalitik data={CONTOH} />);

    const panel = screen.getByText('Melewati Target Selesai').closest('section');
    const teks = (panel as HTMLElement).textContent ?? '';

    expect(teks).toContain('Kalibrasi timbangan');
    expect(teks).toContain('Produksi');
    expect(teks).toContain('4 hari');
  });
});
