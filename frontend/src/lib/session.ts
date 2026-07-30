import 'server-only';

import type { Role } from '@/lib/nav';

export interface PenggunaSesi {
  id: number;
  nama: string;
  email: string;
  role: Role;
  departemen: string;
}

/**
 * Pengguna yang sedang masuk.
 *
 * M0: mengembalikan data sementara agar kerangka navigasi dapat dirender.
 * M1 (Auth & Role) mengganti isi fungsi ini dengan pembacaan token dari
 * httpOnly cookie lalu memanggil `GET /api/me` di backend.
 */
export async function penggunaSaatIni(): Promise<PenggunaSesi> {
  return {
    id: 0,
    nama: 'Pengguna Sementara',
    email: 'sementara@hbmcorp.co.id',
    role: 'administrator',
    departemen: 'Produksi',
  };
}
