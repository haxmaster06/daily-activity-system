'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

const HALAMAN = '/pengaturan/departemen';

export interface DataDepartemen {
  name: string;
  description: string | null;
  is_active: boolean;
  wajib_lapor: boolean;
}

export async function buatDepartemen(data: DataDepartemen): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/departemen', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Departemen berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiDepartemen(id: number, data: DataDepartemen): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/departemen/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Departemen berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusDepartemen(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/departemen/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Departemen berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
