/**
 * Bentuk data Executive Analytics.
 *
 * Tanpa `server-only` — komponen grafik memakainya di peramban. Pengambil
 * datanya ada di `analitik-server.ts`.
 */

export interface BarisStatusDepartemen {
  departemen: string;
  belum_mulai: number;
  dalam_proses: number;
  selesai: number;
}

export interface BarisKepatuhan {
  /** ISO `YYYY-MM-DD`. */
  tanggal: string;
  melapor: number;
  wajib: number;
}

export interface BarisSebaranStatus {
  status: string;
  label: string;
  jumlah: number;
}

export interface BarisBeban {
  nama: string;
  berjalan: number;
  selesai: number;
}

export interface BarisLewatTarget {
  id: number;
  judul: string;
  status: string;
  label_status: string;
  departemen: string;
  penanggung_jawab: string;
  target_selesai: string | null;
  telat_hari: number;
}

export interface DataAnalitik {
  rentang: { dari: string; sampai: string; hari: number };
  status_per_departemen: BarisStatusDepartemen[];
  kepatuhan: BarisKepatuhan[];
  sebaran_status_baris: BarisSebaranStatus[];
  beban_penanggung_jawab: BarisBeban[];
  lewat_target: BarisLewatTarget[];
}

/**
 * Warna grafik, diambil dari token yang sama dengan seluruh aplikasi.
 *
 * Ditulis sebagai nilai hex, bukan kelas Tailwind: Chart.js menggambar ke
 * `<canvas>` dan tidak pernah membaca CSS. Angkanya wajib sama dengan
 * `tailwind.config.ts` — status yang berbeda warna antara badge dan grafik
 * membuat pembacanya mengira keduanya hal yang berlainan.
 */
export const WARNA = {
  belum_mulai: '#727785',
  dalam_proses: '#FF8F00',
  selesai: '#00BFA5',
  primary: '#1A73E8',
  danger: '#BA1A1A',
  garisBantu: '#D9DDE5',
  teks: '#414754',
} as const;

/** Persentase kepatuhan satu hari, aman terhadap pembagi nol. */
export function persenKepatuhan(baris: BarisKepatuhan): number {
  if (baris.wajib === 0) return 0;

  return Math.round((baris.melapor / baris.wajib) * 100);
}
