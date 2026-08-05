import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

function render_(query = '') {
  params = new URLSearchParams(query);

  return render(<PenyaringAnalitik departemen={DEPARTEMEN} batasHari={366} />);
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
  it('menampilkan dua tombol saja, bukan seluruh isiannya', () => {
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
    params = new URLSearchParams();
    render(<PenyaringAnalitik departemen={[DEPARTEMEN[0]]} batasHari={366} />);

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
