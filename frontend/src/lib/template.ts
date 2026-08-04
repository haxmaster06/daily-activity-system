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
  | 'time'
  | 'select'
  | 'multiselect'
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
  /** Kolom menempel di kiri saat tabel isian digulir mendatar. */
  beku: boolean;
  /** Variasi tampilan saat diisi. Null berarti tipe ini hanya punya satu. */
  tampilan: string | null;
}

export interface Template {
  id: number;
  kode: string;
  nama: string;
  keterangan: string | null;
  aktif: boolean;
  /** Bentuk pengisian bawaan: `grid` atau `baris`. */
  bentuk_pengisian: string;
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
  time: 'Jam',
  select: 'Pilihan',
  multiselect: 'Pilihan majemuk',
  master: 'Pilihan dari daftar master',
  boolean: 'Ya / Tidak',
};

/**
 * Variasi tampilan per tipe. Entri pertama tiap tipe adalah bawaannya.
 *
 * Salinan dari `TemplateField::TAMPILAN` di backend. Disalin, bukan diambil
 * lewat API, karena penyusun template membutuhkannya sebelum kolomnya ada.
 */
export const TAMPILAN: Partial<Record<TipeKolom, { nilai: string; label: string }[]>> = {
  select: [
    { nilai: 'dropdown', label: 'Dropdown' },
    { nilai: 'tombol', label: 'Tombol berjajar' },
    { nilai: 'radio', label: 'Radio' },
  ],
  boolean: [
    { nilai: 'centang', label: 'Kotak centang' },
    { nilai: 'sakelar', label: 'Sakelar' },
  ],
  integer: [
    { nilai: 'biasa', label: 'Angka biasa' },
    { nilai: 'stepper', label: 'Dengan tombol naik-turun' },
  ],
  decimal: [
    { nilai: 'biasa', label: 'Angka biasa' },
    { nilai: 'persen', label: 'Persen' },
    { nilai: 'uang', label: 'Rupiah' },
  ],
  text: [
    { nilai: 'biasa', label: 'Teks biasa' },
    { nilai: 'kode', label: 'Kode (huruf seragam)' },
  ],
};

/** Kolom yang menerima satuan dan batas nilai. */
export const TIPE_ANGKA: readonly TipeKolom[] = ['integer', 'decimal'];
