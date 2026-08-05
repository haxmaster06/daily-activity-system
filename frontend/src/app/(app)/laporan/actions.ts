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

/** Satu baris pada hasil pemeriksaan berkas import laporan. */
export interface BarisImportLaporan {
  baris: number;
  tanggal: string | null;
  tampilan: Record<string, string>;
  tindakan: 'diterima' | 'ditolak';
  alasan: string | null;
}

export interface HasilPratinjauImportLaporan {
  template: { id: number; nama: string };
  baris: BarisImportLaporan[];
  tanggal: { tanggal: string; jumlah_baris: number; sudah_ada: boolean }[];
  ringkasan: { diterima: number; ditolak: number; total: number; laporan: number };
  /** Berkas melebihi batas baris; yang diperiksa hanya bagian awalnya. */
  terpotong: boolean;
}

/**
 * Memeriksa berkas laporan tanpa menyimpan apa pun.
 *
 * Berkasnya dikirim ulang saat disimpan, bukan disimpan sementara di server
 * Next — berkas sementara yang tidak pernah terhapus adalah cara paling sunyi
 * untuk menghabiskan ruang penyimpanan.
 */
export async function pratinjauImportLaporan(
  templateId: number,
  berkas: FormData,
): Promise<HasilAksi & { hasil?: HasilPratinjauImportLaporan }> {
  try {
    const { data, message } = await panggilApi<HasilPratinjauImportLaporan>(
      `/template/${templateId}/import/pratinjau`,
      { method: 'POST', body: berkas },
    );

    return { ...hasilBerhasil(message || 'Berkas berhasil dibaca.'), hasil: data };
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function simpanImportLaporan(
  templateId: number,
  berkas: FormData,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/template/${templateId}/import`, {
      method: 'POST',
      body: berkas,
    });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Laporan berhasil diimpor.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
