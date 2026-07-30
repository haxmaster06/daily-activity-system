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
  | 'boolean';

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
  boolean: 'Ya / Tidak',
};

/** Kolom yang menerima satuan dan batas nilai. */
export const TIPE_ANGKA: readonly TipeKolom[] = ['integer', 'decimal'];
