import 'server-only';

import { panggilApi } from '@/lib/api';
import type {
  DataDepartemen,
  DataProduktivitas,
  DataProgres,
  DataRingkasan,
  OpsiAnalitik,
} from '@/lib/analitik';

/**
 * Pengambil data Executive Analytics.
 *
 * Satu pengambil per halaman, bukan satu balasan raksasa. Pembacanya membuka
 * satu halaman pada satu waktu, dan menghitung seluruhnya tiap kali berarti
 * menghitung tiga bagian yang tidak sedang dilihat siapa pun.
 */

/**
 * Menyusun query dari penyaringan yang tersimpan di URL.
 *
 * Penyaringnya hidup di URL supaya dapat dibagikan dan bertahan saat halaman
 * dimuat ulang — dan supaya berpindah antar tab tidak menghapusnya.
 */
export interface FilterAnalitik {
  dari?: string;
  sampai?: string;
  metrik?: string;
  departemen?: string | string[];
  status?: string | string[];
  pengguna?: string | string[];
  template?: string | string[];
  /** Isi kolom laporan, tiap butir berbentuk `kunci:nilai`. */
  nilai?: string | string[];
}

/**
 * Kunci di URL dan kunci di API sengaja berbeda.
 *
 * URL dibaca manusia dan ikut dibagikan lewat tautan: `?departemen=3,7` jauh
 * lebih pendek dan lebih mudah disunting tangan daripada
 * `?departemen_id[]=3&departemen_id[]=7`. Terjemahannya dikerjakan sekali di
 * sini, bukan di tiap halaman.
 */
const KUNCI_API: Record<string, string> = {
  departemen: 'departemen_id[]',
  status: 'status[]',
  pengguna: 'pengguna_id[]',
  template: 'template_id[]',
};

function daftar(nilai: string | string[] | undefined): string[] {
  if (Array.isArray(nilai)) return nilai.filter(Boolean);

  return nilai ? nilai.split(',').filter(Boolean) : [];
}

export function queryAnalitik(filter: FilterAnalitik): URLSearchParams {
  const query = new URLSearchParams();

  if (filter.dari) query.set('dari', filter.dari);
  if (filter.sampai) query.set('sampai', filter.sampai);
  if (filter.metrik) query.set('metrik', filter.metrik);

  for (const [kunciUrl, kunciApi] of Object.entries(KUNCI_API)) {
    for (const satu of daftar(filter[kunciUrl as keyof FilterAnalitik])) {
      query.append(kunciApi, satu);
    }
  }

  /*
   * Penyaring isi kolom tidak pernah dipisah koma. Nilainya adalah isi laporan
   * yang sebenarnya — "PT Sumber Rejeki, Tbk" — dan memisahnya di koma
   * memecah satu nama menjadi dua penyaring yang keduanya tidak cocok apa pun.
   */
  const nilai = Array.isArray(filter.nilai) ? filter.nilai : filter.nilai ? [filter.nilai] : [];

  for (const satu of nilai.filter(Boolean)) {
    query.append('nilai[]', satu);
  }

  return query;
}

async function ambil<T>(jalur: string, query: URLSearchParams): Promise<T> {
  const teks = query.toString();
  const { data } = await panggilApi<T>(`/analitik/${jalur}${teks ? `?${teks}` : ''}`);

  return data;
}

export function ambilOpsiAnalitik(): Promise<OpsiAnalitik> {
  return ambil<OpsiAnalitik>('opsi', new URLSearchParams());
}

export function ambilRingkasan(query: URLSearchParams): Promise<DataRingkasan> {
  return ambil<DataRingkasan>('ringkasan', query);
}

export function ambilProduktivitas(query: URLSearchParams): Promise<DataProduktivitas> {
  return ambil<DataProduktivitas>('produktivitas', query);
}

export function ambilProgres(query: URLSearchParams): Promise<DataProgres> {
  return ambil<DataProgres>('progres', query);
}

export function ambilKeadaanDepartemen(query: URLSearchParams): Promise<DataDepartemen> {
  return ambil<DataDepartemen>('departemen', query);
}
