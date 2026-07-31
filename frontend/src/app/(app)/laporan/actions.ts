'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';
import type { NilaiBaris } from '@/lib/laporan';

const HALAMAN = '/laporan';

export interface KiriBagian {
  report_template_id: number;
  items: NilaiBaris[];
}

export interface KiriLaporan {
  report_date: string;
  sections: KiriBagian[];
}

/** Hasil aksi yang perlu menyertakan id laporan yang baru dibuat. */
export interface HasilSimpan extends HasilAksi {
  id?: number;
}

export async function simpanLaporanBaru(data: KiriLaporan): Promise<HasilSimpan> {
  try {
    const { message, data: laporan } = await panggilApi<{ id: number }>('/laporan', {
      method: 'POST',
      body: data,
    });
    revalidatePath(HALAMAN);

    return { ...hasilBerhasil(message || 'Laporan tersimpan.'), id: laporan.id };
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiLaporan(id: number, data: KiriLaporan): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);
    revalidatePath(`${HALAMAN}/${id}`);

    return hasilBerhasil(message || 'Laporan berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function kirimLaporan(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${id}/kirim`, { method: 'POST' });
    revalidatePath(HALAMAN);
    revalidatePath(`${HALAMAN}/${id}`);

    return hasilBerhasil(message || 'Laporan berhasil dikirim.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function tinjauLaporan(id: number, catatan: string): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${id}/tinjau`, {
      method: 'POST',
      body: { catatan: catatan.trim() || null },
    });
    revalidatePath(HALAMAN);
    revalidatePath(`${HALAMAN}/${id}`);

    return hasilBerhasil(message || 'Laporan ditandai sudah ditinjau.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusDrafLaporan(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Draf laporan berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
