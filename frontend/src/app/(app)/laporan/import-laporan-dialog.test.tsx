import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportLaporanDialog } from './import-laporan-dialog';

const pratinjau = vi.fn();
const simpan = vi.fn();

vi.mock('./actions', () => ({
  pratinjauImportLaporan: (...argumen: unknown[]) => pratinjau(...argumen),
  simpanImportLaporan: (...argumen: unknown[]) => simpan(...argumen),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const TEMPLATE = [
  { id: 1, nama: 'Aktivitas Harian' },
  { id: 2, nama: 'Proses Harian per LOT' },
];

function berkas() {
  return new File(['isi'], 'laporan.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function render_(template = TEMPLATE) {
  return render(
    <ImportLaporanDialog
      terbuka
      onTutup={vi.fn()}
      template={template}
      onSelesai={vi.fn()}
    />,
  );
}

beforeEach(() => {
  pratinjau.mockReset();
  simpan.mockReset();
});

describe('template dipilih lebih dulu', () => {
  /*
   * Bentuk kolom berkas berbeda tiap template. Menerima berkas sebelum
   * templatenya ditentukan berarti memeriksanya terhadap bentuk yang salah,
   * dan seluruh barisnya akan ditolak dengan alasan yang menyesatkan.
   */
  it('mengunci pilihan berkas sampai templatenya ditentukan', () => {
    render_();

    expect(screen.getByLabelText('Berkas Excel')).toBeDisabled();
    expect(
      screen.getByText('Pilih template lebih dulu — bentuk kolomnya berbeda tiap template.'),
    ).toBeInTheDocument();
  });

  it('memilih sendiri bila hanya ada satu template', () => {
    render_([TEMPLATE[0]]);

    expect(screen.getByLabelText('Berkas Excel')).toBeEnabled();
  });
});

describe('pratinjau sebelum menyimpan', () => {
  it('tidak dapat menyimpan sebelum berkasnya diperiksa', () => {
    render_([TEMPLATE[0]]);

    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('menampilkan alasan tiap baris yang ditolak', async () => {
    pratinjau.mockResolvedValue({
      berhasil: true,
      pesan: 'Berkas berhasil dibaca.',
      hasil: {
        template: { id: 1, nama: 'Aktivitas Harian' },
        baris: [
          {
            baris: 2,
            tanggal: '2026-08-01',
            tampilan: { Aktivitas: 'Menimbang bahan' },
            tindakan: 'diterima',
            alasan: null,
          },
          {
            baris: 3,
            tanggal: null,
            tampilan: {},
            tindakan: 'ditolak',
            alasan: 'Tanggal belum diisi atau bentuknya tidak dikenali.',
          },
        ],
        tanggal: [{ tanggal: '2026-08-01', jumlah_baris: 1, sudah_ada: false }],
        ringkasan: { diterima: 1, ditolak: 1, total: 2, laporan: 1 },
        terpotong: false,
      },
    });

    const pengguna = userEvent.setup();
    render_([TEMPLATE[0]]);

    await pengguna.upload(screen.getByLabelText('Berkas Excel'), berkas());

    await waitFor(() =>
      expect(
        screen.getByText('Tanggal belum diisi atau bentuknya tidak dikenali.'),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText('Diterima: 1 baris')).toBeInTheDocument();
    expect(screen.getByText('Dilewati: 1 baris')).toBeInTheDocument();
    expect(screen.getByText('Menjadi 1 laporan draf')).toBeInTheDocument();

    // Baru sekarang boleh disimpan — dan belum ada satu pun yang tersimpan.
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
    expect(simpan).not.toHaveBeenCalled();
  });

  it('tetap mengunci Simpan bila tidak ada baris yang diterima', async () => {
    pratinjau.mockResolvedValue({
      berhasil: true,
      pesan: 'Berkas berhasil dibaca.',
      hasil: {
        template: { id: 1, nama: 'Aktivitas Harian' },
        baris: [
          { baris: 2, tanggal: null, tampilan: {}, tindakan: 'ditolak', alasan: 'Tanggal belum diisi.' },
        ],
        tanggal: [],
        ringkasan: { diterima: 0, ditolak: 1, total: 1, laporan: 0 },
        terpotong: false,
      },
    });

    const pengguna = userEvent.setup();
    render_([TEMPLATE[0]]);

    await pengguna.upload(screen.getByLabelText('Berkas Excel'), berkas());

    await waitFor(() =>
      expect(
        screen.getByText('Tidak ada baris yang dapat disimpan. Perbaiki berkasnya lalu pilih ulang.'),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });
});
