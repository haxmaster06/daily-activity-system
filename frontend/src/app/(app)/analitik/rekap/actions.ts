'use server';

import { hasilGalat, type HasilAksi } from '@/lib/aksi';
import { panggilApi } from '@/lib/api';
import type { Laporan } from '@/lib/laporan';

/**
 * Laporan satu departemen pada rentang yang sedang dilihat.
 *
 * Memakai `/laporan` yang sudah ada, bukan endpoint rekap tersendiri —
 * penyaring departemen dan rentangnya sudah didukung, dan jangkauannya sudah
 * ditegakkan `DailyReport::scopeVisibleTo()`. Menambah endpoint kedua untuk
 * pertanyaan yang sama hanya membuat keduanya lambat laun berbeda.
 *
 * Diambil saat barisnya dibuka, bukan ikut dimuat bersama halaman: dua puluh
 * departemen berarti ratusan laporan yang dikirim untuk paling banyak satu
 * departemen yang benar-benar dibaca.
 */
export async function ambilLaporanDepartemen(
  departemenId: number,
  dari: string,
  sampai: string,
): Promise<HasilAksi & { laporan?: Laporan[] }> {
  try {
    const query = new URLSearchParams({
      departemen_id: String(departemenId),
      dari,
      sampai,
      per_halaman: '10',
    });

    const { data } = await panggilApi<Laporan[]>(`/laporan?${query.toString()}`);

    return { berhasil: true, pesan: '', laporan: data };
  } catch (galat) {
    return hasilGalat(galat);
  }
}
