import 'server-only';

import { panggilApi } from '@/lib/api';
import type { RingkasanRole } from '@/lib/master-data';

/** Katalog hak akses yang dapat dicentang, sudah dikelompokkan untuk layar. */

export interface IzinKatalog {
  kunci: string;
  nama: string;
  keterangan: string | null;
}

export interface GrupIzin {
  kunci: string;
  nama: string;
  izin: IzinKatalog[];
}

export async function ambilKatalogIzin(): Promise<GrupIzin[]> {
  const { data } = await panggilApi<GrupIzin[]>('/izin');

  return data;
}

export async function ambilPeran(): Promise<RingkasanRole[]> {
  const { data } = await panggilApi<RingkasanRole[]>('/role');

  return data;
}
