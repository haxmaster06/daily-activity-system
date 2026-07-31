'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

/**
 * Unggah lampiran.
 *
 * Berkasnya diteruskan sebagai `FormData` — tidak pernah dimuat ke memori
 * sebagai string, dan tidak disinggahkan ke disk server Next.
 */
export async function unggahLampiran(
  laporanId: number,
  data: FormData,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${laporanId}/lampiran`, {
      method: 'POST',
      body: data,
    });

    revalidatePath(`/laporan/${laporanId}`);

    return hasilBerhasil(message || 'Lampiran berhasil diunggah.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusLampiran(
  laporanId: number,
  lampiranId: number,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/lampiran/${lampiranId}`, { method: 'DELETE' });

    revalidatePath(`/laporan/${laporanId}`);

    return hasilBerhasil(message || 'Lampiran berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
