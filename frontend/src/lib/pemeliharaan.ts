import 'server-only';

import { panggilApi } from '@/lib/api';

export interface StatusPemeliharaan {
  aktif: boolean;
  pesan: string | null;
}

/**
 * Status mode pemeliharaan. Endpoint-nya publik dan di luar penjaga
 * pemeliharaan, jadi tetap terbaca saat modenya aktif. Kegagalan apa pun
 * diperlakukan sebagai "tidak aktif" supaya tak mengunci aplikasi karena galat
 * pembacaan.
 */
export async function ambilStatusPemeliharaan(): Promise<StatusPemeliharaan> {
  try {
    const { data } = await panggilApi<StatusPemeliharaan>('/pemeliharaan', {
      autentikasi: false,
    });

    return { aktif: Boolean(data.aktif), pesan: data.pesan ?? null };
  } catch {
    return { aktif: false, pesan: null };
  }
}
