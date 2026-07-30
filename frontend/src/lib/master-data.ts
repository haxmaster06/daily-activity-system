import 'server-only';

import { panggilApi } from '@/lib/api';
import type { Role } from '@/lib/nav';

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
  slug: Role;
  nama: string;
}

export interface Pengguna {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  role: { slug: Role | null; nama: string | null };
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
