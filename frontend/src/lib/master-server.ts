import 'server-only';

import { panggilApi } from '@/lib/api';

export interface JenisMaster {
  id: number;
  slug: string;
  nama: string;
  keterangan: string | null;
  sistem: boolean;
  urutan: number;
  induk_id: number | null;
  induk: { id: number; slug: string; nama: string } | null;
  /** Departemen yang berwenang mengelola isinya. Kosong berarti terbuka. */
  departemen_pengelola?: { id: number; nama: string }[];
  /** Pengguna saat ini boleh mengelola isi daftar ini. */
  boleh_kelola_isi?: boolean;
  jumlah_isi?: number;
}

export interface BarisMaster {
  id: number;
  kode: string;
  nama: string;
  keterangan: string | null;
  aktif: boolean;
  urutan: number;
  induk_id: number | null;
  induk: { id: number; kode: string; nama: string } | null;
  data: Record<string, unknown> | null;
}

export interface HalamanMaster {
  data: BarisMaster[];
  meta: {
    halaman_saat_ini: number;
    per_halaman: number;
    total_data: number;
    total_halaman: number;
  };
}

export async function ambilJenisMaster(): Promise<JenisMaster[]> {
  const { data } = await panggilApi<JenisMaster[]>('/master/jenis');

  return data;
}

export async function ambilIsiMaster(
  slug: string,
  query: URLSearchParams,
): Promise<HalamanMaster> {
  const teks = query.toString();

  return panggilApi<BarisMaster[]>(`/master/${slug}${teks ? `?${teks}` : ''}`) as Promise<
    HalamanMaster
  >;
}

/**
 * Isi daftar induk untuk pemilih induk pada dialog.
 *
 * Memakai jalur pencarian, bukan daftar berpagination: yang dibutuhkan hanya
 * `{id, kode, nama}`, dan jumlahnya dibatasi server.
 */
export async function ambilPilihanInduk(
  slugInduk: string,
): Promise<{ id: number; kode: string; nama: string }[]> {
  const { data } = await panggilApi<{ id: number; kode: string; nama: string }[]>(
    `/master/${slugInduk}/cari?batas=50`,
  );

  return data;
}
