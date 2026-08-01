import 'server-only';

import { panggilApi } from '@/lib/api';

/** Bentuk data master yang dipakai lintas halaman pengaturan. */

export interface Departemen {
  id: number;
  kode: string;
  nama: string;
  keterangan: string | null;
  aktif: boolean;
  jumlah_anggota?: number;
}

export interface RingkasanRole {
  id: number;
  /**
   * Slug peran. Bertipe string biasa, bukan daftar tertutup: administrator
   * dapat membuat peran baru dari layar, sehingga slug apa pun mungkin muncul.
   */
  slug: string;
  nama: string;
  keterangan?: string | null;
  sistem?: boolean;
  jangkauan_bawaan?: number | null;
  jumlah_pengguna?: number;
  izin?: string[];
}

export interface PenetapanPeran {
  id: number;
  role_id: number;
  slug: string;
  nama: string;
  scope_level: number;
  department_id: number | null;
}

export interface Pengguna {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  role: { slug: string | null; nama: string | null };
  penetapan: PenetapanPeran[];
  /** Akun administrator awal — tidak pernah dapat dihapus. */
  sistem?: boolean;
  dapat_dihapus?: boolean;
  /** Ikut terhapus bila akunnya dihapus; dipakai peringatan sebelum menghapus. */
  jumlah_laporan?: number;
  jumlah_lampiran?: number;
  departemen: { id: number | null; kode: string | null; nama: string | null };
}

export async function ambilDepartemen(cari?: string): Promise<Departemen[]> {
  const query = cari ? `?cari=${encodeURIComponent(cari)}` : '';
  const { data } = await panggilApi<Departemen[]>(`/departemen${query}`);

  return data;
}

export async function ambilRole(): Promise<RingkasanRole[]> {
  const { data } = await panggilApi<RingkasanRole[]>('/role');

  return data;
}
