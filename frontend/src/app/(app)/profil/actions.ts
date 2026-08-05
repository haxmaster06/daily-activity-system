'use server';

import { revalidatePath } from 'next/cache';

import { panggilApi } from '@/lib/api';
import { hasilBerhasil, hasilGalat, type HasilAksi } from '@/lib/aksi';

export async function perbaruiProfil(name: string): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/profil', { method: 'PUT', body: { name } });

    // Nama tampil pada bilah navigasi di seluruh halaman.
    revalidatePath('/', 'layout');

    return hasilBerhasil(message || 'Profil berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

/**
 * Mengunggah foto profil.
 *
 * Berkasnya diteruskan apa adanya sebagai FormData; backend menggambar ulang
 * gambarnya sebelum menyimpan, sehingga metadata dan muatan apa pun yang
 * menumpang di dalam berkas tidak pernah ikut tersimpan.
 */
export async function unggahFotoProfil(formulir: FormData): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/profil/foto', {
      method: 'POST',
      body: formulir,
    });

    // Foto tampil pada bilah navigasi di seluruh halaman.
    revalidatePath('/', 'layout');

    return hasilBerhasil(message || 'Foto profil berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function hapusFotoProfil(): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/profil/foto', { method: 'DELETE' });

    revalidatePath('/', 'layout');

    return hasilBerhasil(message || 'Foto profil berhasil dihapus.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}

export async function ubahKataSandi(
  kataSandiLama: string,
  kataSandiBaru: string,
  konfirmasi: string,
): Promise<HasilAksi> {
  try {
    const { message } = await panggilApi('/profil/kata-sandi', {
      method: 'PUT',
      body: {
        kata_sandi_lama: kataSandiLama,
        kata_sandi_baru: kataSandiBaru,
        kata_sandi_baru_confirmation: konfirmasi,
      },
    });

    return hasilBerhasil(message || 'Kata sandi berhasil diperbarui.');
  } catch (galat) {
    return hasilGalat(galat);
  }
}
