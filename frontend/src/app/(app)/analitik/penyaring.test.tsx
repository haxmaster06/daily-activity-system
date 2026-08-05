import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpsiAnalitik } from '@/lib/analitik';

import { PenyaringAnalitik } from './penyaring';

const push = vi.fn();
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/analitik',
  useSearchParams: () => params,
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const DEPARTEMEN = [
  { id: 1, nama: 'Produksi' },
  { id: 2, nama: 'Quality Control' },
  { id: 3, nama: 'EX/IM' },
];

const OPSI: OpsiAnalitik = {
  departemen: DEPARTEMEN,
  pengguna: [
    { id: 11, nama: 'Pengawas Produksi', departemen: 'Produksi' },
    { id: 12, nama: 'Staf Quality Control', departemen: 'Quality Control' },
  ],
  template: [
    { id: 21, nama: 'Proses Harian', departemen_id: 1 },
    { id: 22, nama: 'Purchase Order', departemen_id: 3 },
  ],
  status: [
    { nilai: 'belum_mulai', label: 'Belum Mulai' },
    { nilai: 'dalam_proses', label: 'Dalam Proses' },
    { nilai: 'selesai', label: 'Selesai' },
  ],
  metrik: [],
  batas_hari: 366,
};

function render_(query = '', opsi: OpsiAnalitik = OPSI) {
  params = new URLSearchParams(query);

  return render(<PenyaringAnalitik opsi={opsi} />);
}

beforeEach(() => {
  push.mockReset();
});

/**
 * Penyaring ini pernah memakan tiga baris: dua pemilih tanggal, tiga tombol
 * pintasan, lalu satu pil per departemen. Pada dua puluh departemen, deretan
 * pilnya sendiri menghabiskan setengah layar sebelum satu angka pun terlihat.
 */
describe('yang tampil sepanjang waktu hanya kesimpulannya', () => {
  it('menampilkan tombol ringkasnya saja, bukan seluruh isiannya', () => {
    render_();

    expect(screen.getByRole('button', { name: 'Ubah rentang tanggal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pilih departemen' })).toBeInTheDocument();

    // Isian tanggal dan daftar departemen belum dirender sebelum dibuka.
    expect(screen.queryByLabelText('Dari')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Produksi' })).not.toBeInTheDocument();
  });

  it('menyebutkan rentang bawaan tanpa menuntut penyaringnya dibuka', () => {
    render_();

    expect(screen.getByText('30 hari terakhir')).toBeInTheDocument();
    expect(screen.getByText('Semua departemen')).toBeInTheDocument();
  });

  it('menyebut nama departemennya saat hanya satu yang dipilih', () => {
    render_('departemen=2');

    expect(screen.getByText('Quality Control')).toBeInTheDocument();
  });

  it('menyebut jumlahnya saat lebih dari satu dipilih', () => {
    render_('departemen=1,3');

    expect(screen.getByText('2 departemen')).toBeInTheDocument();
  });

  it('mengenali rentang yang persis sama dengan pintasannya', () => {
    const hariIni = new Date();
    const tujuhHari = new Date();
    tujuhHari.setDate(tujuhHari.getDate() - 6);

    const iso = (t: Date) => t.toISOString().slice(0, 10);

    render_(`dari=${iso(tujuhHari)}&sampai=${iso(hariIni)}`);

    // Bukan "1 Agu 2026 – 7 Agu 2026": pintasannya lebih cepat dibaca.
    expect(screen.getByText('7 hari terakhir')).toBeInTheDocument();
  });
});

describe('tombol Bersihkan', () => {
  it('tidak ada saat memang tidak ada yang perlu dibersihkan', () => {
    render_();

    expect(screen.queryByRole('button', { name: /Bersihkan/ })).not.toBeInTheDocument();
  });

  it('muncul begitu ada penyaring yang aktif', () => {
    render_('departemen=1');

    expect(screen.getByRole('button', { name: /Bersihkan/ })).toBeInTheDocument();
  });
});

describe('pemilih departemen', () => {
  it('tidak ditawarkan bila hanya ada satu departemen', () => {
    render_('', { ...OPSI, departemen: [DEPARTEMEN[0]] });

    // Pemantau satu departemen tidak perlu ditawari pilihan yang jawabannya
    // sudah pasti.
    expect(screen.queryByRole('button', { name: 'Pilih departemen' })).not.toBeInTheDocument();
  });

  it('menulis pilihannya ke alamat, bukan ke state', async () => {
    const pengguna = userEvent.setup();
    render_();

    await pengguna.click(screen.getByRole('button', { name: 'Pilih departemen' }));

    const daftar = await screen.findByRole('button', { name: 'Quality Control' });
    await pengguna.click(daftar);

    /*
     * Penyaringan yang hidup di URL dapat dibagikan lewat tautan, bertahan saat
     * halaman dimuat ulang, dan ikut terbawa saat berpindah tab.
     */
    expect(push).toHaveBeenCalledWith('/analitik?departemen=2');
  });

  it('menambah pilihan, bukan menggantinya', async () => {
    const pengguna = userEvent.setup();
    render_('departemen=1');

    await pengguna.click(screen.getByRole('button', { name: 'Pilih departemen' }));
    await pengguna.click(await screen.findByRole('button', { name: 'EX/IM' }));

    expect(push).toHaveBeenCalledWith('/analitik?departemen=1%2C3');
  });
});

describe('penyaring selain departemen', () => {
  it('menawarkan status, orang, dan template sebagai penyaring tersendiri', () => {
    render_();

    expect(screen.getByRole('button', { name: 'Pilih status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pilih orang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pilih template laporan' })).toBeInTheDocument();
  });

  it('menyembunyikan penyaring yang pilihannya tinggal satu', () => {
    render_('', { ...OPSI, template: [OPSI.template[0]] });

    expect(
      screen.queryByRole('button', { name: 'Pilih template laporan' }),
    ).not.toBeInTheDocument();
  });

  it('menulis pilihan status ke alamat', async () => {
    const pengguna = userEvent.setup();
    render_();

    await pengguna.click(screen.getByRole('button', { name: 'Pilih status' }));
    await pengguna.click(await screen.findByRole('button', { name: 'Dalam Proses' }));

    expect(push).toHaveBeenCalledWith('/analitik?status=dalam_proses');
  });

  /*
   * Penyaring isi kolom datang dari klik pada isi halaman — sebuah nama pembeli,
   * sebuah tahapan. Bila kepingnya tidak terlihat di bilah penyaring, satu-
   * satunya cara melepasnya adalah menemukan kembali tempat menekannya.
   */
  it('menampilkan penyaring isi kolom sebagai keping yang dapat dilepas', async () => {
    const pengguna = userEvent.setup();
    render_('nilai=pembeli%3APT+Pembeli+Alfa');

    const keping = screen.getByRole('button', { name: 'Lepaskan penyaring PT Pembeli Alfa' });

    expect(keping).toBeInTheDocument();

    await pengguna.click(keping);

    expect(push).toHaveBeenCalledWith('/analitik');
  });
});

describe('pintasan rentang', () => {
  it('menulis kedua ujung tanggalnya sekaligus', async () => {
    const pengguna = userEvent.setup();
    render_();

    await pengguna.click(screen.getByRole('button', { name: 'Ubah rentang tanggal' }));

    const popover = await screen.findByText('Pintasan');
    const wadah = popover.parentElement as HTMLElement;

    await pengguna.click(within(wadah).getByRole('button', { name: /7 hari terakhir/ }));

    expect(push).toHaveBeenCalledTimes(1);

    const alamat = push.mock.calls[0][0] as string;

    expect(alamat).toContain('dari=');
    expect(alamat).toContain('sampai=');
  });
});
