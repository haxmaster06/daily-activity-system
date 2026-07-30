'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

const HALAMAN = '/pengaturan/pengguna';

export interface DataPengguna {
  name: string;
  email: string;
  department_id: number;
  role_id: number;
  password?: string;
}

export async function buatPengguna(data: DataPengguna): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/pengguna', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Pengguna berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiPengguna(id: number, data: DataPengguna): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/pengguna/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Pengguna berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function ubahStatusPengguna(id: number, aktif: boolean): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/pengguna/${id}/status`, {
      method: 'PUT',
      body: { aktif },
    });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message);
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function aturUlangKataSandi(id: number, password: string): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/pengguna/${id}/kata-sandi`, {
      method: 'PUT',
      body: { password },
    });

    return hasilBerhasil(message || 'Kata sandi berhasil diatur ulang.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
