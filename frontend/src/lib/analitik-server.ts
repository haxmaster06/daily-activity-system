import 'server-only';

import { panggilApi } from '@/lib/api';
import type {
  DataDepartemen,
  DataKepatuhan,
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
export function queryAnalitik(filter: {
  dari?: string;
  sampai?: string;
  departemen?: string | string[];
  metrik?: string;
}): URLSearchParams {
  const query = new URLSearchParams();

  if (filter.dari) query.set('dari', filter.dari);
  if (filter.sampai) query.set('sampai', filter.sampai);
  if (filter.metrik) query.set('metrik', filter.metrik);

  const departemen = Array.isArray(filter.departemen)
    ? filter.departemen
    : filter.departemen
      ? filter.departemen.split(',')
      : [];

  for (const satu of departemen.filter(Boolean)) {
    query.append('departemen_id[]', satu);
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

export function ambilKepatuhan(query: URLSearchParams): Promise<DataKepatuhan> {
  return ambil<DataKepatuhan>('kepatuhan', query);
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
