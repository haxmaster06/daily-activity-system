import 'server-only';

import { redirect } from 'next/navigation';

import { GalatApi } from '@/lib/api';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';

/**
 * Hasil Server Action yang dikonsumsi komponen form.
 *
 * Mutasi dijalankan sebagai Server Action, bukan lewat `fetch` dari browser,
 * agar token tetap berada di sisi server dan tidak perlu ada endpoint proxy
 * tersendiri untuk setiap tindakan.
 */
export interface HasilAksi {
  berhasil: boolean;
  pesan: string;
  /** Galat per kolom, dipetakan ke input pada form. */
  errors?: Record<string, string[]>;
}

export function hasilBerhasil(pesan: string): HasilAksi {
  return { berhasil: true, pesan };
}

/**
 * Menerjemahkan galat apa pun menjadi pesan yang aman ditampilkan.
 *
 * Galat tak terduga tidak pernah membocorkan detail teknis ke antarmuka
 * (non-fungsional §27).
 */
export function hasilGalat(galat: unknown): HasilAksi {
  if (galat instanceof GalatApi) {
    /*
     * Sesi yang berakhir di tengah pengisian form tidak cukup ditampilkan
     * sebagai pesan: apa pun yang ditekan pengguna setelahnya akan gagal
     * dengan cara yang sama. Cookie basinya dibersihkan lalu pengguna
     * diantar ke halaman masuk, lengkap dengan penjelasan penyebabnya.
     */
    if (galat.status === 401) {
      redirect(RUTE_SESI_BERAKHIR);
    }

    return {
      berhasil: false,
      pesan: galat.reference ? `${galat.message} (Kode: ${galat.reference})` : galat.message,
      errors: galat.errors,
    };
  }

  return {
    berhasil: false,
    pesan: 'Terjadi gangguan saat memproses permintaan.',
  };
}
