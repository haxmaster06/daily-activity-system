'use server';

import { hasilGalat, type HasilAksi } from '@/lib/aksi';
import { panggilApi } from '@/lib/api';
import type { Laporan } from '@/lib/laporan';

/**
 * Mengambil satu laporan lengkap untuk ditampilkan di dalam modal.
 *
 * Diambil saat modalnya dibuka, bukan ikut dimuat bersama halaman: satu
 * departemen menawarkan sampai delapan laporan, dan dua puluh departemen berarti
 * ratusan laporan lengkap yang dikirim untuk paling banyak satu yang dibaca.
 *
 * Jangkauannya tetap ditegakkan `DailyReport::scopeVisibleTo()` di server —
 * laporan di luar jangkauan terbaca sebagai tidak ada.
 */
export async function ambilLaporanUntukTampilan(
  id: number,
): Promise<HasilAksi & { laporan?: Laporan }> {
  try {
    const { data } = await panggilApi<Laporan>(`/laporan/${id}`);

    return { berhasil: true, pesan: '', laporan: data };
  } catch (galat) {
    return hasilGalat(galat);
  }
}
