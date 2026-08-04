'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';
import type { TipeKolom } from '@/lib/template';

const HALAMAN = '/pengaturan/template';

export interface KiriKolom {
  key: string;
  label: string;
  group_label: string | null;
  type: TipeKolom;
  is_required: boolean;
  unit: string | null;
  help_text: string | null;
  options: { nilai: string; label: string }[] | null;
  lookup_source: string | null;
  computed_from: string | null;
  /*
   * Keempatnya sudah lama divalidasi backend tetapi tidak pernah dikirim dari
   * sini, sehingga batas nilai dan teks contoh mustahil diatur lewat layar.
   */
  placeholder: string | null;
  min_value: number | null;
  max_value: number | null;
  desimal: number | null;
  master_type_id: number | null;
  master_induk_key: string | null;
  beku: boolean;
  tampilan: string | null;
}

export interface KiriTemplate {
  name: string;
  description: string | null;
  department_id: number | null;
  is_active: boolean;
  bentuk_pengisian: string;
  fields: KiriKolom[];
}

export async function buatTemplate(data: KiriTemplate): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/template', { method: 'POST', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Template berhasil dibuat.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function perbaruiTemplate(id: number, data: KiriTemplate): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/template/${id}`, { method: 'PUT', body: data });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Template berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusTemplate(id: number): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi(`/template/${id}`, { method: 'DELETE' });
    revalidatePath(HALAMAN);

    return hasilBerhasil(message || 'Template berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
