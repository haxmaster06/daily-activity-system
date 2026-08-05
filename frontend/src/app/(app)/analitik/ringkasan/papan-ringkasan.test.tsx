import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DataRingkasan } from '@/lib/analitik';
import { PapanRingkasan } from './papan-ringkasan';

/*
 * Grafiknya diganti boneka. Chart.js menggambar ke `<canvas>`, dan jsdom tidak
 * menyediakan konteks gambar sama sekali — merendernya sungguhan hanya
 * menghasilkan galat yang tidak ada hubungannya dengan yang diuji di sini.
 */
/*
 * TautanDepartemen memakai penyaring bersama, yang membaca alamat halaman.
 * Tanpa tiruan ini seluruh papan gagal dirender karena alasan yang tidak ada
 * hubungannya dengan tabel pendamping yang sedang diuji.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/analitik/ringkasan',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../grafik', () => ({
  GrafikTrenKepatuhan: () => <div data-testid="grafik" data-nama="tren" />,
  GrafikSebaranStatus: () => <div data-testid="grafik" data-nama="sebaran" />,
  GrafikStatusDepartemen: () => <div data-testid="grafik" data-nama="departemen" />,
}));

const CONTOH: DataRingkasan = {
  rentang: { dari: '2026-07-07', sampai: '2026-08-05', hari: 30, departemen_id: [] },
  kartu: [
    {
      kunci: 'kepatuhan',
      label: 'Kepatuhan pelaporan',
      nilai: 82,
      satuan: '%',
      sebelumnya: 91,
      arah_baik: 'naik',
      keterangan: 'Bagian hari kerja yang benar-benar terisi laporan.',
    },
    {
      kunci: 'telat',
      label: 'Kartu lewat target',
      nilai: 4,
      satuan: 'kartu',
      sebelumnya: 8,
      arah_baik: 'turun',
      keterangan: 'Target selesainya sudah lewat.',
    },
    {
      kunci: 'menunggu',
      label: 'Menunggu tinjauan',
      nilai: 3,
      satuan: 'laporan',
      sebelumnya: null,
      arah_baik: 'turun',
      keterangan: 'Sudah dikirim, belum ditinjau.',
    },
  ],
  tren_kepatuhan: [
    { tanggal: '2026-08-04', melapor: 8, wajib: 10, persen: 80, akhir_pekan: false, dikirim: 8, draf: 0 },
    { tanggal: '2026-08-05', melapor: 9, wajib: 10, persen: 90, akhir_pekan: false, dikirim: 9, draf: 0 },
  ],
  sebaran_status_baris: [
    { status: 'belum_mulai', label: 'Belum Mulai', jumlah: 5, persen: 16 },
    { status: 'dalam_proses', label: 'Dalam Proses', jumlah: 6, persen: 19 },
    { status: 'selesai', label: 'Selesai', jumlah: 21, persen: 65 },
  ],
  status_per_departemen: [
    { departemen_id: 1, departemen: 'Produksi', belum_mulai: 4, dalam_proses: 7, selesai: 12, total: 23 },
  ],
  sorotan: [
    { jenis: 'perhatian', teks: 'Quality Control paling tertinggal, 40%.' },
    { jenis: 'baik', teks: 'Produksi paling tertib melapor, 95%.' },
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
    render(<PapanRingkasan data={CONTOH} />);

    const grafik = screen.getAllByTestId('grafik');
    expect(grafik).toHaveLength(3);

    for (const satu of grafik) {
      const panel = satu.closest('section');

      expect(panel, `grafik ${satu.dataset.nama} tidak berada di dalam panel`).not.toBeNull();
      expect(
        panel?.querySelector('table'),
        `grafik ${satu.dataset.nama} tidak punya tabel pendamping`,
      ).not.toBeNull();
    }
  });
});

describe('kartu angka', () => {
  /*
   * Arah membaik berbeda tiap kartu: kepatuhan naik itu baik, kartu telat naik
   * itu buruk. Warna yang mengikuti tanda selisih saja akan mewarnai
   * "telat berkurang" sebagai kabar buruk.
   */
  it('membaca penurunan kartu telat sebagai kabar baik', () => {
    render(<PapanRingkasan data={CONTOH} />);

    const telat = screen.getByText('Kartu lewat target').closest('div');
    const teks = within(telat as HTMLElement).getByText(/-50%/);

    expect(teks.className).toContain('text-secondary-text');
  });

  it('membaca penurunan kepatuhan sebagai kabar buruk', () => {
    render(<PapanRingkasan data={CONTOH} />);

    const kepatuhan = screen.getByText('Kepatuhan pelaporan').closest('div');
    const teks = within(kepatuhan as HTMLElement).getByText(/-10%/);

    expect(teks.className).toContain('text-danger-text');
  });

  it('menyebutkan kartu tanpa pembanding apa adanya', () => {
    render(<PapanRingkasan data={CONTOH} />);

    const menunggu = screen.getByText('Menunggu tinjauan').closest('div');

    expect(within(menunggu as HTMLElement).getByText('Tanpa pembanding')).toBeInTheDocument();
  });
});

describe('sorotan', () => {
  /*
   * Bagian yang paling sering dibaca, dan satu-satunya yang tidak menuntut
   * pembacanya menafsirkan grafik.
   */
  it('menampilkan kalimat yang langsung menunjuk tindak lanjutnya', () => {
    render(<PapanRingkasan data={CONTOH} />);

    expect(screen.getByText('Quality Control paling tertinggal, 40%.')).toBeInTheDocument();
    expect(screen.getByText('Produksi paling tertib melapor, 95%.')).toBeInTheDocument();
  });
});

describe('penanda akhir pekan', () => {
  /*
   * Banyak departemen memang tidak melapor hari Minggu. Tanpa penanda, tren
   * kepatuhan terbaca seperti kemerosotan berulang tiap pekan.
   */
  it('menandai baris akhir pekan pada tabel', () => {
    render(
      <PapanRingkasan
        data={{
          ...CONTOH,
          tren_kepatuhan: [
            { tanggal: '2026-08-02', melapor: 0, wajib: 10, persen: 0, akhir_pekan: true, dikirim: 0, draf: 0 },
          ],
        }}
      />,
    );

    expect(screen.getByText('(akhir pekan)')).toBeInTheDocument();
  });
});
