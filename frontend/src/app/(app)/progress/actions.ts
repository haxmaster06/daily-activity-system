'use server';

import { revalidatePath } from 'next/cache';

import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';
import { panggilApi } from '@/lib/api';
import type { StatusTugas } from '@/lib/tugas';

const HALAMAN = '/progress';

export interface DataTugas {
  title: string;
  description: string | null;
  department_id: number;
  penanggung_jawab_id: number | null;
  status: StatusTugas;
  prioritas: string | null;
  target_selesai: string | null;
  laporan_id: number[];
}

export async function buatTugas(data: DataTugas): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/tugas', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Tugas berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiTugas(id: number, data: DataTugas): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/tugas/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Tugas berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

/**
 * Memindahkan kartu ke kolom dan posisi baru.
 *
 * Sengaja tidak memanggil `revalidatePath`. Papan sudah memindahkan kartunya
 * lebih dulu di layar; memuat ulang seluruh halaman setelah tiap geseran akan
 * membuat papan berkedip dan menghapus kartu yang sedang dibuka dialognya.
 * Susunan yang benar diambil kembali saat halaman dimuat berikutnya.
 */
export async function geserTugas(
  id: number,
  status: StatusTugas,
  urutan: number,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/tugas/${id}/geser`, {
      method: 'PATCH',
      body: { status, urutan },
    });

    return hasilBerhasil(message || 'Tugas berhasil dipindahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusTugas(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/tugas/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Tugas berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
