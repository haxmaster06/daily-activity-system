import 'server-only';

import { panggilApi } from '@/lib/api';
import type { Laporan } from '@/lib/laporan';
import type { KolomPapan } from '@/lib/tugas';

/**
 * Pengambil data papan progres.
 *
 * Terpisah dari `tugas.ts` karena memanggil backend dan membaca cookie —
 * hanya boleh berjalan di server.
 */

export async function ambilPapan(query: URLSearchParams): Promise<KolomPapan[]> {
  const teks = query.toString();
  const { data } = await panggilApi<KolomPapan[]>(teks ? `/tugas?${teks}` : '/tugas');

  return data;
}

/**
 * Laporan yang dapat ditautkan sebagai bukti pengerjaan.
 *
 * Dibatasi 30 hari terakhir, bukan seluruh riwayat: kartu progres menandai
 * pekerjaan yang sedang berjalan, dan daftar berisi ratusan laporan lama
 * membuat pemilihnya tidak terpakai.
 *
 * Jangkauannya tetap ditegakkan server lewat `DailyReport::scopeVisibleTo()`;
 * penyaringan tanggal di sini hanya soal panjang daftar.
 */
export async function ambilLaporanTertaut(): Promise<Laporan[]> {
  const dari = new Date();
  dari.setDate(dari.getDate() - 30);

  const query = new URLSearchParams({
    dari: dari.toISOString().slice(0, 10),
    per_halaman: '50',
  });

  const { data } = await panggilApi<Laporan[]>(`/laporan?${query.toString()}`);

  return data;
}
