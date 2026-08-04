/**
 * Bentuk template laporan dan label yang menyertainya.
 *
 * Berkas ini **tidak** memakai `server-only` karena komponen client ikut
 * memakainya untuk merender form dinamis. Fungsi pengambil datanya ada di
 * `template-server.ts` yang memang hanya berjalan di server.
 */

export type TipeKolom =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'month'
  | 'select'
  | 'master'
  | 'boolean';

/** Nilai kolom master: salinan, bukan kunci asing. */
export interface NilaiMaster {
  kode: string;
  nama: string;
}

export interface PilihanKolom {
  nilai: string;
  label: string;
}

export interface KolomTemplate {
  id: number;
  kunci: string;
  label: string;
  grup: string | null;
  tipe: TipeKolom;
  wajib: boolean;
  urutan: number;
  satuan: string | null;
  placeholder: string | null;
  bantuan: string | null;
  pilihan: PilihanKolom[] | null;
  sumber_master: string | null;
  rumus: string | null;
  nilai_min: number | null;
  nilai_maks: number | null;
  /** Angka di belakang koma untuk tipe `decimal`. Null berarti bawaan (2). */
  desimal: number | null;
  master_jenis_id: number | null;
  master_jenis: { id: number; slug: string; nama: string; induk_id: number | null } | null;
  /** Kunci kolom pada template yang sama yang menyaring daftar ini. */
  master_induk_kunci: string | null;
}

export interface Template {
  id: number;
  kode: string;
  nama: string;
  keterangan: string | null;
  aktif: boolean;
  urutan: number;
  versi: number;
  berlaku_umum: boolean;
  departemen?: { id: number | null; kode: string | null; nama: string | null };
  jumlah_kolom?: number;
  kolom?: KolomTemplate[];
}

export interface OpsiPenyusunKolom {
  tipe: { nilai: TipeKolom; label: string }[];
  sumber_master: { nilai: string; label: string }[];
}

/** Label Bahasa Indonesia untuk tiap tipe kolom. */
export const LABEL_TIPE: Record<TipeKolom, string> = {
  text: 'Teks singkat',
  textarea: 'Teks panjang',
  integer: 'Angka bulat',
  decimal: 'Angka desimal',
  date: 'Tanggal',
  month: 'Bulan',
  select: 'Pilihan',
  master: 'Pilihan dari daftar master',
  boolean: 'Ya / Tidak',
};

/** Kolom yang menerima satuan dan batas nilai. */
export const TIPE_ANGKA: readonly TipeKolom[] = ['integer', 'decimal'];
