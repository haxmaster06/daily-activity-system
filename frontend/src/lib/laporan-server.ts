import 'server-only';

import type { MetaHalaman } from '@/components/ui/pagination';
import { panggilApi } from '@/lib/api';
import type { Laporan } from '@/lib/laporan';

/**
 * Pengambil data laporan.
 *
 * Terpisah dari `laporan.ts` karena memanggil backend dan membaca cookie —
 * hanya boleh berjalan di server.
 */

export interface DaftarLaporan {
  data: Laporan[];
  meta: MetaHalaman;
}

export async function ambilDaftarLaporan(query: URLSearchParams): Promise<DaftarLaporan> {
  const teks = query.toString();
  const { data, meta } = await panggilApi<Laporan[]>(teks ? `/laporan?${teks}` : '/laporan');

  return { data, meta: meta as MetaHalaman };
}

export async function ambilLaporan(id: number): Promise<Laporan> {
  const { data } = await panggilApi<Laporan>(`/laporan/${id}`);

  return data;
}
