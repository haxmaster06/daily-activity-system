import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Laporan } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';
import { TampilanLaporan } from './tampilan-laporan';

function kolom(sebagian: Partial<KolomTemplate> & Pick<KolomTemplate, 'kunci' | 'label' | 'tipe'>): KolomTemplate {
  return {
    id: Math.random(),
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
    tampilan: null,
    ...sebagian,
  };
}

const KOLOM: KolomTemplate[] = [
  kolom({ kunci: 'perusahaan', label: 'Nama Perusahaan', tipe: 'text', urutan: 0 }),
  kolom({ kunci: 'pembeli', label: 'Pembeli', tipe: 'master', urutan: 1 }),
  kolom({ kunci: 'qty', label: 'QTY Keluar', tipe: 'decimal', satuan: 'kg', desimal: 2, urutan: 2, grup: 'Oven' }),
  kolom({ kunci: 'jumlah', label: 'Box', tipe: 'integer', satuan: 'box', urutan: 3, grup: 'Oven' }),
  kolom({ kunci: 'lembur', label: 'Lembur', tipe: 'boolean', urutan: 4 }),
  kolom({
    kunci: 'tahap',
    label: 'Tahap',
    tipe: 'select',
    urutan: 5,
    pilihan: [
      { nilai: 'oven', label: 'Pengovenan' },
      { nilai: 'packing', label: 'Packing' },
    ],
  }),
  kolom({ kunci: 'mulai', label: 'Tanggal Mulai', tipe: 'date', urutan: 6 }),
  kolom({ kunci: 'catatan', label: 'Keterangan', tipe: 'textarea', urutan: 7 }),
  kolom({ kunci: 'kosong', label: 'Kolom Tak Terisi', tipe: 'text', urutan: 8 }),
];

const LAPORAN: Laporan = {
  id: 7,
  tanggal: '2026-08-05',
  status: 'dikirim',
  label_status: 'Dikirim',
  dikirim_pada: '2026-08-05T16:20:00+07:00',
  ditinjau_pada: null,
  catatan_tinjauan: null,
  dapat_disunting: false,
  penyusun: { id: 3, nama: 'Penyusun Contoh' },
  departemen: { id: 1, nama: 'Produksi' },
  bagian: [
    {
      id: 1,
      urutan: 0,
      template: { id: 1, kode: 'PROD', nama: 'Proses Harian', kolom: KOLOM },
      baris: [
        {
          id: 11,
          urutan: 0,
          status: 'selesai',
          nilai: {
            perusahaan: 'PT Contoh Nusantara',
            pembeli: { kode: 'BUY_ALFA', nama: 'PT Pembeli Alfa' },
            qty: 1240.5,
            jumlah: 42,
            lembur: true,
            tahap: 'oven',
            mulai: '2026-08-01',
            catatan: 'Proses berjalan normal.',
            kosong: null,
          },
        },
      ],
    },
  ],
};

/**
 * Tampilan baca menggantikan tabel lebar untuk pembaca yang tidak ikut
 * mengetiknya. Yang diuji di sini bukan tata letaknya, melainkan bahwa tidak
 * ada bentuk penyimpanan yang bocor ke layar.
 */
describe('nilai dibaca manusia, bukan bentuk simpanannya', () => {
  it('menerjemahkan tiap tipe kolom ke bentuk bacanya', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    // Kolom master menyimpan {kode, nama}; yang dibaca namanya.
    expect(screen.getByText('PT Pembeli Alfa')).toBeInTheDocument();
    // Boolean, bukan "true".
    expect(screen.getByText('Ya')).toBeInTheDocument();
    // Pilihan memakai labelnya, bukan nilai simpanannya.
    expect(screen.getByText('Pengovenan')).toBeInTheDocument();
    // Tanggal dalam Bahasa Indonesia, bukan ISO.
    expect(screen.getByText('1 Agustus 2026')).toBeInTheDocument();
    // Desimal mengikuti pengaturan kolomnya.
    expect(screen.getByText('1.240,50')).toBeInTheDocument();
  });

  it('tidak menampilkan nilai mentah yang membocorkan bentuk simpanannya', () => {
    const { container } = render(<TampilanLaporan laporan={LAPORAN} />);
    const teks = container.textContent ?? '';

    expect(teks).not.toMatch(/\btrue\b|\bfalse\b/);
    expect(teks).not.toContain('BUY_ALFA');
    expect(teks).not.toContain('2026-08-01');
  });
});

describe('kolom kosong', () => {
  /*
   * Laporan dengan lima belas kolom yang hanya enam terisi akan menampilkan
   * sembilan baris "—" yang tidak berarti apa-apa, dan justru menenggelamkan
   * yang terisi.
   */
  it('menyembunyikan kolom yang tidak diisi', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    expect(screen.queryByText('Kolom Tak Terisi')).not.toBeInTheDocument();
  });
});

describe('grup kolom', () => {
  /*
   * Pada template Proses Harian per LOT, label "QTY Masuk" muncul lima kali
   * dengan grup berbeda. Tanpa nama grupnya, kelimanya tidak dapat dibedakan.
   */
  it('menyebutkan nama grup di atas kolom yang bergrup', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    expect(screen.getByText('Oven')).toBeInTheDocument();
  });

  it('menyertakan satuan di sebelah nama kolomnya', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    const label = screen.getByText('QTY Keluar').closest('dt');

    expect(within(label as HTMLElement).getByText('(kg)')).toBeInTheDocument();
  });
});

/*
 * Keluhan yang memicu bentuk ini: "5 Agustus 2026" pecah menjadi tiga baris,
 * dan nama perusahaan tiga kata menjadi tiga baris pula. Penyebabnya sel yang
 * lebarnya seragam sepertiga kisi. Lebar sel kini mengikuti panjang isinya, dan
 * itulah yang dijaga di sini — tata letak tidak dapat diukur di jsdom, tetapi
 * keputusan lebarnya dapat.
 */
describe('lebar sel mengikuti panjang isinya', () => {
  function sel(label: string) {
    return screen.getByText(label).closest('div');
  }

  it('memberi dua sel pada nilai yang panjang', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    // "PT Contoh Nusantara" — tidak muat pada satu sel selebar sepertiga kisi.
    expect(sel('Nama Perusahaan')).toHaveClass('laporan-luas');
  });

  it('membiarkan nilai pendek pada satu sel', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    // "1 Agustus 2026" muat utuh; melebarkannya hanya menyisakan ruang kosong.
    expect(sel('Tanggal Mulai')).not.toHaveClass('laporan-luas');
    expect(sel('Tanggal Mulai')).not.toHaveClass('laporan-penuh');
  });

  it('memberi satu baris penuh pada teks bebas', () => {
    render(<TampilanLaporan laporan={LAPORAN} />);

    expect(sel('Keterangan')).toHaveClass('laporan-penuh');
  });
});

describe('laporan tanpa isi', () => {
  it('menjelaskan keadaannya, bukan menampilkan halaman kosong', () => {
    render(<TampilanLaporan laporan={{ ...LAPORAN, bagian: [] }} />);

    expect(screen.getByText('Laporan ini belum punya isi.')).toBeInTheDocument();
  });
});
