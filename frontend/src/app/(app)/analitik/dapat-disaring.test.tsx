import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { TautanNilai, TautanDepartemen, TautanStatus } from './dapat-disaring';

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

function render_(query = '') {
  params = new URLSearchParams(query);

  return render(
    <TooltipProvider>
      <TautanDepartemen id={5} nama="Produksi" />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
});

/**
 * Penyaringan kini dapat diubah dari banyak tempat — bilah penyaring, batang
 * grafik, baris tabel, judul kartu. Perilakunya harus sama di semuanya, dan
 * itulah yang diuji di sini.
 */
describe('menyaring dari mana pun departemen disebut', () => {
  it('menyaring ke satu departemen saat ditekan', async () => {
    const pengguna = userEvent.setup();
    render_();

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya Produksi' }));

    expect(push).toHaveBeenCalledWith('/analitik?departemen=5');
  });

  /*
   * Menekan hal yang sama dua kali mengembalikan keadaan semula. Tanpa itu,
   * pengguna yang tidak sengaja menyaring harus mencari tombol Bersihkan untuk
   * kembali — dan pada halaman yang tinggal satu kartu, tombol itu tidak
   * terlihat sama sekali.
   */
  it('melepaskan penyaringnya saat ditekan ulang', async () => {
    const pengguna = userEvent.setup();
    render_('departemen=5');

    await pengguna.click(screen.getByRole('button', { name: 'Lepaskan penyaring Produksi' }));

    expect(push).toHaveBeenCalledWith('/analitik');
  });

  it('mengganti pilihan, bukan menambah, saat departemen lain sedang tersaring', async () => {
    const pengguna = userEvent.setup();
    render_('departemen=9');

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya Produksi' }));

    // Menekan satu departemen berarti "tampilkan yang ini", bukan "tambahkan".
    // Menambah beberapa sekaligus tetap bisa lewat bilah penyaring.
    expect(push).toHaveBeenCalledWith('/analitik?departemen=5');
  });

  it('mempertahankan penyaring lain yang sedang berlaku', async () => {
    const pengguna = userEvent.setup();
    render_('dari=2026-08-01&sampai=2026-08-05');

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya Produksi' }));

    const alamat = push.mock.calls[0][0] as string;

    expect(alamat).toContain('dari=2026-08-01');
    expect(alamat).toContain('sampai=2026-08-05');
    expect(alamat).toContain('departemen=5');
  });
});

/**
 * Penyaringan bukan hanya departemen. Status, orang, template, tanggal, dan isi
 * kolom laporan semuanya dapat ditekan, dan semuanya memakai perilaku yang sama.
 */
describe('penyaring selain departemen', () => {
  function renderTautan(anak: React.ReactNode, query = '') {
    params = new URLSearchParams(query);

    return render(<TooltipProvider>{anak}</TooltipProvider>);
  }

  it('menyaring menurut status saat badge ditekan', async () => {
    const pengguna = userEvent.setup();
    renderTautan(<TautanStatus status="selesai" label="Selesai" />);

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya Selesai' }));

    expect(push).toHaveBeenCalledWith('/analitik?status=selesai');
  });

  /*
   * Kolom master menyimpan salinan `{kode, nama}`: namanya yang dibaca, kodenya
   * yang menyaring. Mengirim namanya membuat dua master bernama sama terhitung
   * sebagai satu.
   */
  it('mengirim kode master, bukan namanya yang terbaca', async () => {
    const pengguna = userEvent.setup();
    renderTautan(<TautanNilai kunci="pembeli" saring="BUY_ALFA" teks="PT Pembeli Alfa" />);

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya PT Pembeli Alfa' }));

    expect(push).toHaveBeenCalledWith('/analitik?nilai=pembeli%3ABUY_ALFA');
  });

  /*
   * Dua nilai pada kolom yang sama tidak pernah muncul bersamaan pada satu
   * baris; menumpuknya selalu menghasilkan halaman kosong. Kolom berbeda tetap
   * dapat aktif bersamaan.
   */
  it('mengganti nilai pada kolom yang sama, dan menambah pada kolom lain', async () => {
    const pengguna = userEvent.setup();
    renderTautan(
      <TautanNilai kunci="pembeli" saring="BUY_BETA" teks="PT Pembeli Beta" />,
      'nilai=pembeli%3ABUY_ALFA&nilai=tahap%3Aoven',
    );

    await pengguna.click(screen.getByRole('button', { name: 'Saring hanya PT Pembeli Beta' }));

    const alamat = push.mock.calls[0][0] as string;

    expect(alamat).toContain('nilai=tahap%3Aoven');
    expect(alamat).toContain('nilai=pembeli%3ABUY_BETA');
    expect(alamat).not.toContain('BUY_ALFA');
  });
});

describe('terjangkau tanpa tetikus', () => {
  /*
   * Namanya menyebutkan tindakannya, bukan hanya nama departemennya. Tanpa itu,
   * pembaca layar mengumumkan "Produksi, tombol" dan tidak ada cara mengetahui
   * bahwa menekannya menyaring seluruh halaman. Tooltip tidak menutup celah itu:
   * isinya hanya terbaca setelah terfokus, dan tidak pernah pada layar sentuh.
   */
  it('menyebutkan tindakannya pada nama tombolnya', () => {
    render_();

    expect(screen.getByRole('button', { name: 'Saring hanya Produksi' })).toBeInTheDocument();
  });

  it('mengubah namanya saat penyaringnya sedang aktif', () => {
    render_('departemen=5');

    expect(
      screen.getByRole('button', { name: 'Lepaskan penyaring Produksi' }),
    ).toBeInTheDocument();
  });

  it('dapat dijalankan dengan papan ketik', async () => {
    const pengguna = userEvent.setup();
    render_();

    await pengguna.tab();
    expect(screen.getByRole('button', { name: 'Saring hanya Produksi' })).toHaveFocus();

    await pengguna.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/analitik?departemen=5');
  });
});
