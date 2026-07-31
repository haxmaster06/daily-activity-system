import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { GalatApi, panggilApi } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';
import { bolehAkses, type Role } from '@/lib/nav';

export interface PenggunaSesi {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  role: Role;
  namaRole: string;
  departemenId: number | null;
  departemen: string;
}

interface PenggunaApi {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  role: { slug: string | null; nama: string | null };
  departemen: { id: number | null; kode: string | null; nama: string | null };
}

const ROLE_DIKENAL: readonly Role[] = ['staff', 'supervisor', 'manager', 'administrator'];

function keRole(slug: string | null): Role {
  return ROLE_DIKENAL.includes(slug as Role) ? (slug as Role) : 'staff';
}

/**
 * Pengguna yang sedang masuk, atau null bila belum masuk.
 *
 * Dibungkus `cache` agar beberapa Server Component pada satu render hanya
 * memicu satu panggilan `GET /api/me`.
 */
export const penggunaSaatIni = cache(async (): Promise<PenggunaSesi | null> => {
  const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;

  if (!token) {
    return null;
  }

  try {
    const { data } = await panggilApi<PenggunaApi>('/me');

    return {
      id: data.id,
      nama: data.nama,
      email: data.email,
      aktif: data.aktif,
      role: keRole(data.role.slug),
      namaRole: data.role.nama ?? 'Staff',
      departemenId: data.departemen.id,
      departemen: data.departemen.nama ?? '—',
    };
  } catch (galat) {
    // Token kedaluwarsa atau dicabut: perlakukan sebagai belum masuk.
    if (galat instanceof GalatApi && (galat.status === 401 || galat.status === 403)) {
      return null;
    }

    throw galat;
  }
});

/**
 * Memastikan pengguna sudah masuk dan role-nya boleh membuka halaman tersebut.
 *
 * Dipanggil di halaman terbatas. Menyembunyikan menu tidak menghentikan
 * siapa pun yang mengetik alamatnya langsung.
 */
export async function wajibAkses(href: string): Promise<PenggunaSesi> {
  const pengguna = await penggunaSaatIni();

  if (pengguna === null) {
    /*
     * Lewat Route Handler, bukan langsung ke /login: cookie yang sudah basi
     * harus dihapus dulu, dan Server Component tidak boleh menghapus cookie.
     * Tanpa itu middleware melihat cookie, mengizinkan halaman, lalu halaman
     * mengarahkan ke /login lagi — berputar tanpa henti.
     */
    redirect('/api/auth/sesi-berakhir');
  }

  if (!bolehAkses(pengguna.role, href)) {
    redirect('/dashboard');
  }

  return pengguna;
}
