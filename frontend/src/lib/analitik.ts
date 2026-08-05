/**
 * Bentuk data Executive Analytics.
 *
 * Tanpa `server-only` — komponen grafik memakainya di peramban. Pengambil
 * datanya ada di `analitik-server.ts`.
 */

export interface RentangAnalitik {
  dari: string;
  sampai: string;
  hari: number;
  departemen_id: number[];
}

/* ---------------------------------------------------------------- Ringkasan */

export interface KartuKpi {
  kunci: string;
  label: string;
  nilai: number;
  satuan: string;
  /** Periode sebelumnya yang panjangnya sama. Null berarti tidak berpembanding. */
  sebelumnya: number | null;
  /** Arah yang dianggap membaik — menentukan warna selisihnya. */
  arah_baik: 'naik' | 'turun';
  keterangan: string;
}

export interface Sorotan {
  jenis: 'baik' | 'perhatian';
  teks: string;
}

export interface BarisKepatuhanHarian {
  tanggal: string;
  melapor: number;
  wajib: number;
  persen: number;
  akhir_pekan: boolean;
  dikirim: number;
  draf: number;
}

export interface BarisSebaranStatus {
  status: string;
  label: string;
  jumlah: number;
  persen: number;
}

export interface BarisStatusDepartemen {
  departemen_id: number;
  departemen: string;
  belum_mulai: number;
  dalam_proses: number;
  selesai: number;
  total: number;
}

export interface DataRingkasan {
  rentang: RentangAnalitik;
  kartu: KartuKpi[];
  tren_kepatuhan: BarisKepatuhanHarian[];
  sebaran_status_baris: BarisSebaranStatus[];
  status_per_departemen: BarisStatusDepartemen[];
  sorotan: Sorotan[];
}

/* ---------------------------------------------------------------- Kepatuhan */

/* ------------------------------------------------------------ Produktivitas */

export interface Metrik {
  penanda: string;
  kunci: string;
  label: string;
  satuan: string;
  desimal: boolean;
  template: string[];
}

export interface DataProduktivitas {
  rentang: RentangAnalitik;
  metrik_tersedia: Metrik[];
  data: {
    metrik: Metrik;
    per_hari: { tanggal: string; nilai: number; baris: number; pelapor: number }[];
    per_departemen: {
      departemen_id: number;
      departemen: string;
      nilai: number;
      baris: number;
    }[];
    per_orang: { pengguna_id: number; nama: string; nilai: number; hari: number }[];
    ringkasan: {
      total: number;
      rata_per_hari: number;
      hari_berisi: number;
      hari_rentang: number;
      tertinggi: { tanggal: string; nilai: number } | null;
    };
  } | null;
}

/* ------------------------------------------------------------------ Progres */

export interface BarisBeban {
  nama: string;
  berjalan: number;
  selesai: number;
  telat: number;
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

export interface BarisUmurKartu {
  id: number;
  judul: string;
  status: string;
  label_status: string;
  departemen: string;
  penanggung_jawab: string;
  umur_hari: number;
}

export interface DataProgres {
  rentang: RentangAnalitik;
  status_per_departemen: BarisStatusDepartemen[];
  sebaran_status_baris: BarisSebaranStatus[];
  beban_penanggung_jawab: BarisBeban[];
  lewat_target: BarisLewatTarget[];
  umur_kartu: BarisUmurKartu[];
  ringkasan: {
    total: number;
    berjalan: number;
    selesai: number;
    telat: number;
    tanpa_penanggung_jawab: number;
  };
}

export interface OpsiAnalitik {
  departemen: { id: number; nama: string }[];
  metrik: Metrik[];
  batas_hari: number;
}

/* -------------------------------------------------------------------- Warna */

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

/** Selisih terhadap periode sebelumnya, dalam persen. */
export function selisihPersen(kartu: KartuKpi): number | null {
  if (kartu.sebelumnya === null || kartu.sebelumnya === 0) return null;

  return Math.round(((kartu.nilai - kartu.sebelumnya) / kartu.sebelumnya) * 100);
}

/** Apakah selisihnya kabar baik, mengikuti arah yang diinginkan tiap kartu. */
export function selisihMembaik(kartu: KartuKpi, selisih: number): boolean {
  return kartu.arah_baik === 'naik' ? selisih >= 0 : selisih <= 0;
}


/* --------------------------------------------------------------- Departemen */

export interface SorotanAngka {
  jenis: 'angka';
  label: string;
  satuan: string;
  total: number;
  baris: number;
}

export interface SorotanDaftar {
  jenis: 'master' | 'pilihan' | 'teks';
  label: string;
  jumlah_berbeda: number;
  nilai: { teks: string; jumlah: number }[];
}

export type SorotanDepartemen = SorotanAngka | SorotanDaftar;

export interface RingkasLaporan {
  id: number;
  tanggal: string;
  penyusun: string;
  status: string;
  label_status: string;
  jumlah_baris: number;
}

export interface KeadaanDepartemen {
  departemen_id: number;
  departemen: string;
  jumlah_laporan: number;
  jumlah_baris: number;
  terakhir: { tanggal: string; penyusun: string } | null;
  status_baris: Record<string, number>;
  sorotan: SorotanDepartemen[];
  laporan: RingkasLaporan[];
}

export interface DataDepartemen {
  rentang: RentangAnalitik;
  departemen: KeadaanDepartemen[];
}
