'use server';

import { revalidatePath } from 'next/cache';

import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';
import { panggilApi } from '@/lib/api';

const HALAMAN = '/pengaturan/master-data';

export interface DataJenis {
  name: string;
  parent_type_id: number | null;
  description: string | null;
}

export interface DataBaris {
  name: string;
  parent_id: number | null;
  description: string | null;
  is_active: boolean;
}

export async function buatJenis(data: DataJenis): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/master/jenis', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Daftar berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiJenis(slug: string, data: DataJenis): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/jenis/${slug}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Daftar berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusJenis(slug: string): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/jenis/${slug}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Daftar berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function buatBaris(slug: string, data: DataBaris): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/${slug}`, { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Data berhasil ditambahkan.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiBaris(
  slug: string,
  id: number,
  data: DataBaris,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/${slug}/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Data berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusBaris(slug: string, id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/${slug}/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Data berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

/** Satu baris pada hasil pemeriksaan berkas import. */
export interface BarisImport {
  baris: number;
  nama: string;
  induk: string | null;
  keterangan: string | null;
  aktif: boolean;
  tindakan: 'baru' | 'perbarui' | 'ditolak';
  alasan: string | null;
}

export interface HasilPratinjauImport {
  jenis: { slug: string; nama: string };
  baris: BarisImport[];
  ringkasan: { baru: number; perbarui: number; ditolak: number; total: number };
  /** Berkas melebihi batas baris; yang diperiksa hanya bagian awalnya. */
  terpotong: boolean;
}

/**
 * Memeriksa berkas tanpa menyimpan apa pun.
 *
 * Berkasnya dikirim ulang saat disimpan, bukan disimpan sementara di server
 * Next. Menyimpannya berarti mengurus pembersihan berkas sisa, dan berkas
 * sementara yang tidak pernah terhapus adalah cara paling sunyi untuk
 * menghabiskan ruang penyimpanan.
 */
export async function pratinjauImport(
  slug: string,
  berkas: FormData,
): Promise<HasilAksi & { hasil?: HasilPratinjauImport }> {
  try {
    const { data, message } = await panggilApi<HasilPratinjauImport>(
      `/master/${slug}/import/pratinjau`,
      { method: 'POST', body: berkas },
    );

    return { ...hasilBerhasil(message || 'Berkas berhasil dibaca.'), hasil: data };
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function simpanImport(slug: string, berkas: FormData): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/master/${slug}/import`, {
      method: 'POST',
      body: berkas,
    });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Data berhasil diimpor.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
