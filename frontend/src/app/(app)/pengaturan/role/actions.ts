'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

const HALAMAN = '/pengaturan/role';

export interface DataPeran {
  name: string;
  description: string | null;
  scope_level_default: number | null;
  /** Kunci izin, bukan id — kuncinya sama di semua environment. */
  izin: string[];
}

export async function buatPeran(data: DataPeran): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/role', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Peran berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiPeran(id: number, data: DataPeran): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/role/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    // Hak akses berubah berarti menu dan tombol pengguna lain ikut berubah.
    revalidatePath('/', 'layout');

    return hasilBerhasil(message || 'Peran berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusPeran(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/role/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Peran berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
