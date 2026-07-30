import 'server-only';

import { panggilApi } from '@/lib/api';
import type { OpsiPenyusunKolom, Template } from '@/lib/template';

/**
 * Pengambil data template.
 *
 * Terpisah dari `template.ts` karena berkas ini memanggil backend dan
 * membaca cookie — hanya boleh berjalan di server. Tipe dan labelnya tinggal
 * di `template.ts` agar tetap dapat dipakai komponen client.
 */

export async function ambilTemplate(query?: URLSearchParams): Promise<Template[]> {
  const teks = query?.toString();
  const { data } = await panggilApi<Template[]>(teks ? `/template?${teks}` : '/template');

  return data;
}

export async function ambilSatuTemplate(id: number): Promise<Template> {
  const { data } = await panggilApi<Template>(`/template/${id}`);

  return data;
}

export async function ambilOpsiKolom(): Promise<OpsiPenyusunKolom> {
  const { data } = await panggilApi<OpsiPenyusunKolom>('/template/opsi-kolom');

  return data;
}
