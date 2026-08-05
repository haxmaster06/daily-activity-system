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

export interface BarisKepatuhanDepartemen {
  departemen_id: number;
  departemen: string;
  anggota: number;
  laporan: number;
  seharusnya: number;
  persen: number;
}

export interface SelPetaPanas {
  tanggal: string;
  melapor: number;
  persen: number;
}

export interface BarisPetaPanas {
  departemen_id: number;
  departemen: string;
  anggota: number;
  sel: SelPetaPanas[];
}

export interface BarisKepatuhanOrang {
  id: number;
  nama: string;
  departemen: string;
  laporan: number;
  seharusnya: number;
  persen: number;
  terakhir: string | null;
  bolong_beruntun: number;
}

export interface DataKepatuhan {
  rentang: RentangAnalitik;
  per_hari: BarisKepatuhanHarian[];
  per_departemen: BarisKepatuhanDepartemen[];
  peta_panas: { tanggal: string[]; baris: BarisPetaPanas[] };
  per_orang: BarisKepatuhanOrang[];
  jam_kirim: { jam: number; jumlah: number }[];
}

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

/**
 * Warna latar satu sel peta panas.
 *
 * Bertingkat, bukan gradasi mulus: mata jauh lebih cepat membedakan lima
 * tingkat daripada seratus. Nilai nol dibedakan tegas dari "sedikit" — itu
 * perbedaan yang paling ingin ditemukan pembacanya.
 */
export function warnaPetaPanas(persen: number, anggota: number): string {
  if (anggota === 0) return 'bg-surface-muted';
  if (persen === 0) return 'bg-danger-subtle';
  if (persen < 40) return 'bg-accent-subtle';
  if (persen < 70) return 'bg-secondary-subtle';
  if (persen < 100) return 'bg-secondary/40';

  return 'bg-secondary/70';
}
