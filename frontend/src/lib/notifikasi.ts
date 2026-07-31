/** Bentuk notifikasi yang dipakai lonceng di bilah navigasi. */

export type JenisNotifikasi =
  | 'laporan_dikirim'
  | 'laporan_ditinjau'
  | 'pengingat_laporan'
  | 'umum';

export interface Notifikasi {
  id: string;
  jenis: JenisNotifikasi;
  judul: string;
  pesan: string;
  tautan: string | null;
  dibaca: boolean;
  waktu: string | null;
}

export interface KotakNotifikasi {
  jumlah_belum_dibaca: number;
  daftar: Notifikasi[];
}
