import 'server-only';

import { GalatApi } from '@/lib/api';

export interface HasilPenyaringan<T> {
  data: T;
  /**
   * Terisi bila penyaringan ditolak server dan halaman dimuat memakai nilai
   * bawaan. Null berarti penyaringannya diterima apa adanya.
   */
  peringatan: string | null;
}

/**
 * Memuat data terfilter tanpa menjatuhkan seluruh halaman.
 *
 * Penyaringan yang tidak masuk akal — rentang tanggal terbalik, misalnya —
 * dapat dibuat siapa pun lewat pemilih tanggal biasa. Menjawabnya dengan
 * halaman galat membuat pengguna kehilangan penyaringnya sekaligus dan tidak
 * tahu apa yang salah. Yang dilakukan di sini: kunci bermasalah dilepas,
 * datanya dimuat ulang dengan nilai bawaan, dan alasannya dikembalikan untuk
 * ditampilkan di tempat.
 *
 * Kegagalan selain penyaringan tetap dilempar ke batas galat.
 */
export async function denganPenyaringanAman<T>(
  query: URLSearchParams,
  ambil: (query: URLSearchParams) => Promise<T>,
  kunciDilepas: readonly string[] = ['dari', 'sampai'],
): Promise<HasilPenyaringan<T>> {
  try {
    return { data: await ambil(query), peringatan: null };
  } catch (galat) {
    if (!(galat instanceof GalatApi) || galat.status !== 422) {
      throw galat;
    }

    const bersih = new URLSearchParams(query);
    for (const kunci of kunciDilepas) bersih.delete(kunci);

    /*
     * Pesan per kolom lebih berguna daripada pesan umum "Periksa kembali isian
     * Anda" — pengguna perlu tahu isian mana yang keliru, bukan bahwa ada yang
     * keliru.
     */
    const pesanKolom = Object.values(galat.errors ?? {})
      .flat()
      .filter((pesan): pesan is string => typeof pesan === 'string');

    return {
      data: await ambil(bersih),
      peringatan: pesanKolom[0] ?? galat.message,
    };
  }
}
