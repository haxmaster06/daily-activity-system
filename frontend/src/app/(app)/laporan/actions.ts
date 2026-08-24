'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';
import type { IsiDraf } from '@/lib/draf-laporan';
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

/**
 * Menduplikat laporan menjadi draf baru pada tanggal lain.
 *
 * Mengembalikan id laporan barunya supaya pemanggilnya dapat langsung membuka
 * halamannya — isian angka masih kosong dan memang perlu segera dilengkapi.
 */
export async function duplikatLaporan(
  id: number,
  tanggal: string,
): Promise<HasilAksi & { idBaru?: number }> {
  try {
    const { message, data } = await panggilApi<{ id: number }>(`/laporan/${id}/duplikat`, {
      method: 'POST',
      body: { report_date: tanggal },
    });

    revalidatePath(HALAMAN);

    return {
      ...hasilBerhasil(message || 'Laporan berhasil diduplikat.'),
      idBaru: data?.id,
    };
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

/**
 * Menandai beberapa laporan sudah ditinjau sekaligus.
 *
 * Catatan tinjauan bersifat per laporan, jadi jalur massal ini tidak
 * menyertakannya — yang tak memenuhi syarat dilewati di server, bukan
 * menggagalkan seluruh permintaan.
 */
export async function tinjauMassal(
  ids: number[],
): Promise<HasilAksi & { ditinjau: number; dilewati: number }> {
  try {
    const { message, data } = await panggilApi<{
      ditinjau: number;
      dilewati: { tanggal: string; penyusun: string | null; alasan: string }[];
    }>('/laporan/tinjau-massal', { method: 'POST', body: { laporan_id: ids } });
    revalidatePath(HALAMAN);

    return {
      ...hasilBerhasil(message || 'Laporan ditandai sudah ditinjau.'),
      ditinjau: data?.ditinjau ?? 0,
      dilewati: data?.dilewati?.length ?? 0,
    };
  } catch (galat) {
    return { ...hasilGalat(galat), ditinjau: 0, dilewati: 0 };
  }
}

export async function hapusLaporan(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/laporan/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Laporan berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

/* --------------------------------------------------- Auto-save draf ke server
 *
 * Jaring pemulihan lintas perangkat. Terpisah dari simpan laporan resmi karena
 * tak divalidasi per sel — form setengah jadi pun tersimpan. Kegagalan ditelan
 * diam-diam: auto-save latar tak boleh menampilkan galat atau memicu banner
 * versi. Tak ada revalidatePath — form tak boleh ikut ter-refresh.
 */

export type PayloadDrafServer = Omit<IsiDraf, 'disimpanPada'>;

export interface DrafServer {
  payload: PayloadDrafServer;
  disimpanPada: string;
}

export async function bacaDrafServer(kunci: string): Promise<DrafServer | null> {
  try {
    const { data } = await panggilApi<{
      payload: PayloadDrafServer;
      disimpan_pada: string;
    } | null>(`/draf-laporan/${kunci}`);

    return data ? { payload: data.payload, disimpanPada: data.disimpan_pada } : null;
  } catch {
    return null;
  }
}

export async function simpanDrafServer(kunci: string, payload: PayloadDrafServer): Promise<void> {
  try {
    await panggilApi(`/draf-laporan/${kunci}`, { method: 'PUT', body: { payload } });
  } catch {
    // Diam-diam disengaja.
  }
}

export async function hapusDrafServer(kunci: string): Promise<void> {
  try {
    await panggilApi(`/draf-laporan/${kunci}`, { method: 'DELETE' });
  } catch {
    // Diam-diam disengaja.
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
