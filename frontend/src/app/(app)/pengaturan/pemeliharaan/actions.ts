'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

export async function aturPemeliharaan(aktif: boolean, pesan: string): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/pemeliharaan', {
      method: 'PUT',
      body: { aktif, pesan: pesan.trim() || null },
    });

    revalidatePath('/pengaturan/pemeliharaan');
    // Spanduk pemeliharaan hidup di layout aplikasi.
    revalidatePath('/', 'layout');

    return hasilBerhasil(message || 'Tersimpan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
