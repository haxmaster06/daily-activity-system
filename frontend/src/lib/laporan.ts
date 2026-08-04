import type { KolomTemplate, NilaiMaster } from '@/lib/template';

/**
 * Bentuk laporan harian.
 *
 * Tanpa `server-only` karena komponen client memakainya untuk merender form
 * dinamis. Pengambil datanya ada di `laporan-server.ts`.
 */

export type StatusLaporan = 'draf' | 'dikirim' | 'ditinjau';

export type StatusBaris = 'belum_mulai' | 'dalam_proses' | 'selesai';

/**
 * Isi satu sel.
 *
 * Kolom master menyimpan salinan `{kode, nama}`; sisanya skalar. Bentuk skalar
 * tetap mungkin muncul pada kolom master — laporan lama yang kolomnya dulu
 * bertipe teks menyimpan string biasa, dan laporan itu harus tetap terbaca.
 */
export type NilaiSel = string | number | boolean | string[] | NilaiMaster | null;

/** Nilai satu baris, berkunci `template_fields.key`. */
export type NilaiBaris = Record<string, NilaiSel>;

export interface BarisLaporan {
  id: number;
  urutan: number;
  status: StatusBaris | null;
  nilai: NilaiBaris;
}

export interface BagianLaporan {
  id: number;
  urutan: number;
  template: {
    id: number;
    kode: string;
    nama: string;
    kolom: KolomTemplate[];
  };
  baris: BarisLaporan[];
}

export interface Lampiran {
  id: number;
  nama: string;
  tipe: string;
  /** Bita. Diformat lewat `lib/format`. */
  ukuran: number;
  diunggah_pada: string | null;
  pengunggah?: string;
}

export interface Laporan {
  id: number;
  /** ISO `YYYY-MM-DD`. Pemformatan Bahasa Indonesia dikerjakan `lib/format`. */
  tanggal: string;
  status: StatusLaporan;
  label_status: string;
  dikirim_pada: string | null;
  ditinjau_pada: string | null;
  catatan_tinjauan: string | null;
  dapat_disunting: boolean;
  penyusun?: { id: number; nama: string };
  departemen?: { id: number; nama: string };
  peninjau?: { id: number; nama: string } | null;
  jumlah_bagian?: number;
  bagian?: BagianLaporan[];
  lampiran?: Lampiran[];
}

/** Warna badge status laporan, sama di seluruh aplikasi (standarisasi §16). */
export const RAGAM_STATUS: Record<StatusLaporan, 'belum_mulai' | 'dalam_proses' | 'selesai'> = {
  draf: 'belum_mulai',
  dikirim: 'dalam_proses',
  ditinjau: 'selesai',
};

/**
 * Baris kosong sesuai bentuk template.
 *
 * Kolom hitungan tidak diikutkan — nilainya dihitung server, dan menaruhnya di
 * sini akan membuat antarmuka seolah menerima isian untuk kolom itu.
 */
export function barisKosong(kolom: KolomTemplate[]): NilaiBaris {
  const baris: NilaiBaris = {};

  for (const item of kolom) {
    if (item.rumus) continue;
    baris[item.kunci] = item.tipe === 'boolean' ? false : null;
  }

  return baris;
}

/**
 * Menghitung kolom rumus untuk ditampilkan sementara di antarmuka.
 *
 * Hanya untuk pratinjau saat mengetik. Nilai yang benar-benar disimpan selalu
 * dihitung ulang server — angka dari klien tidak pernah dipercaya
 * (`App\Support\Rumus`).
 */
export function hitungPratinjau(rumus: string, nilai: NilaiBaris): number | null {
  const token = rumus.match(/[a-z_][a-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/gi);
  if (!token || token.length === 0) return null;

  const prioritas: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const keluaran: string[] = [];
  const operator: string[] = [];

  // Shunting-yard, sama seperti App\Support\Rumus di backend. Sengaja tidak
  // memakai `eval` maupun `new Function`: rumus adalah teks dari basis data,
  // dan mengevaluasinya sebagai kode membuka jalan masuk yang tidak perlu ada.
  for (const item of token) {
    if (item in prioritas) {
      while (
        operator.length > 0 &&
        operator[operator.length - 1] !== '(' &&
        prioritas[operator[operator.length - 1]] >= prioritas[item]
      ) {
        keluaran.push(operator.pop()!);
      }
      operator.push(item);
    } else if (item === '(') {
      operator.push(item);
    } else if (item === ')') {
      while (operator.length > 0 && operator[operator.length - 1] !== '(') {
        keluaran.push(operator.pop()!);
      }
      if (operator.pop() !== '(') return null;
    } else {
      keluaran.push(item);
    }
  }

  while (operator.length > 0) {
    const sisa = operator.pop()!;
    if (sisa === '(') return null;
    keluaran.push(sisa);
  }

  const tumpukan: number[] = [];

  for (const item of keluaran) {
    if (item in prioritas) {
      const kanan = tumpukan.pop();
      const kiri = tumpukan.pop();
      if (kiri === undefined || kanan === undefined) return null;

      if (item === '/' && kanan === 0) return null;

      tumpukan.push(
        item === '+'
          ? kiri + kanan
          : item === '-'
            ? kiri - kanan
            : item === '*'
              ? kiri * kanan
              : kiri / kanan,
      );
      continue;
    }

    if (/^\d/.test(item)) {
      tumpukan.push(Number(item));
      continue;
    }

    // Nama kolom. Kolom kosong dihitung nol, sama seperti di server.
    const isi = nilai[item];
    tumpukan.push(typeof isi === 'number' ? isi : Number(isi) || 0);
  }

  if (tumpukan.length !== 1 || !Number.isFinite(tumpukan[0])) return null;

  return Math.round(tumpukan[0] * 1000) / 1000;
}
