import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { GalatApi, panggilApi } from '@/lib/api';
import { NAMA_COOKIE_TOKEN, RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { JANGKAUAN_PRIBADI, type Jangkauan } from '@/lib/izin';
import { bolehAkses } from '@/lib/nav';

export interface PenetapanSesi {
  slug: string;
  nama: string;
  scopeLevel: number;
  departemenId: number | null;
}

export interface PenggunaSesi {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  /** Alamat fotonya, atau null bila belum ada. */
  foto: string | null;
  /** Slug peran utama. Untuk pelabelan saja — keputusan izin memakai `izin`. */
  role: string;
  namaRole: string;
  penetapan: PenetapanSesi[];
  /** Gabungan izin dari seluruh peran yang dipegang. */
  izin: string[];
  jangkauan: Jangkauan;
  /** Benar-benar mengelola setidaknya satu daftar master. */
  bolehKelolaMaster: boolean;
  departemenId: number | null;
  departemen: string;
}

interface PenggunaApi {
  id: number;
  nama: string;
  email: string;
  aktif: boolean;
  foto?: string | null;
  role: { slug: string | null; nama: string | null };
  penetapan?: {
    role_id: number;
    slug: string;
    nama: string;
    scope_level: number;
    department_id: number | null;
  }[];
  izin?: string[];
  jangkauan?: { level: number; label: string; departemen_id: number[] };
  boleh_kelola_master?: boolean;
  departemen: { id: number | null; kode: string | null; nama: string | null };
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
      foto: data.foto ?? null,
      /*
       * Slug tidak lagi diterjemahkan ke daftar tertutup. Peran dapat dibuat
       * administrator, sehingga slug yang tidak dikenal itu wajar — dan
       * menurunkannya menjadi 'staff' akan salah melabeli setiap peran baru.
       */
      role: data.role.slug ?? '',
      namaRole: data.role.nama ?? 'Tanpa peran',
      penetapan: (data.penetapan ?? []).map((satu) => ({
        slug: satu.slug,
        nama: satu.nama,
        scopeLevel: satu.scope_level,
        departemenId: satu.department_id,
      })),
      izin: data.izin ?? [],
      // Kemampuan yang tidak dapat disimpulkan dari izin saja.
      bolehKelolaMaster: data.boleh_kelola_master ?? false,
      jangkauan: {
        level: (data.jangkauan?.level ?? JANGKAUAN_PRIBADI) as Jangkauan['level'],
        departemenId: data.jangkauan?.departemen_id ?? [],
      },
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
 * Memastikan pengguna sudah masuk dan izinnya cukup untuk halaman tersebut.
 *
 * Dipanggil di halaman terbatas. Menyembunyikan menu tidak menghentikan
 * siapa pun yang mengetik alamatnya langsung.
 */
export async function wajibAkses(href: string): Promise<PenggunaSesi> {
  const pengguna = await penggunaSaatIni();

  if (pengguna === null) {
    redirect(RUTE_SESI_BERAKHIR);
  }

  if (!bolehAkses(pengguna.izin, href, { bolehKelolaMaster: pengguna.bolehKelolaMaster })) {
    redirect('/dashboard');
  }

  return pengguna;
}
