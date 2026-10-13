import { redirect } from 'next/navigation';

import { JANGKAUAN_KORPORAT } from '@/lib/izin';
import { ambilDaftarLaporan } from '@/lib/laporan-server';
import { wajibAkses } from '@/lib/session';
import type { FilterAnalitik } from '@/lib/analitik-server';
import { PapanRekap } from './papan-rekap';

export const metadata = { title: 'Rekap Daily Activity — DAMS' };

/** Nilai tunggal saja; daftar berisi banyak pilihan berarti "semua". */
function satuNilai(nilai: string | string[] | undefined): string | null {
  if (Array.isArray(nilai) || nilai === undefined) return null;

  const bagian = nilai.split(',').filter(Boolean);

  return bagian.length === 1 ? bagian[0] : null;
}

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik & { halaman?: string }>;
}) {
  const pengguna = await wajibAkses('/analitik');

  /*
   * Halaman berjudul "rekap seluruh departemen" yang hanya menampilkan satu
   * departemen adalah halaman yang berbohong tentang apa yang ditawarkannya.
   * Tabnya memang sudah disembunyikan, tetapi URL tetap dapat diketik.
   */
  if (pengguna.jangkauan.level !== JANGKAUAN_KORPORAT) redirect('/analitik');

  const filter = await searchParams;

  /*
   * Memakai `/laporan` yang sudah ada — penyaring rentang, departemen, status,
   * dan paginasinya sudah didukung, dan jangkauannya sudah ditegakkan
   * `DailyReport::scopeVisibleTo()`.
   *
   * Bar penyaring Analytics memperbolehkan banyak departemen sekaligus,
   * sedangkan `/laporan` menerima satu. Yang banyak karena itu diperlakukan
   * sebagai "semua" — lebih jujur daripada diam-diam memakai yang pertama.
   */
  const query = new URLSearchParams({ per_halaman: '15' });
  if (filter.dari) query.set('dari', filter.dari);
  if (filter.sampai) query.set('sampai', filter.sampai);

  const departemen = satuNilai(filter.departemen);
  if (departemen) query.set('departemen_id', departemen);

  const status = satuNilai(filter.status);
  if (status) query.set('status', status);

  if (filter.halaman) query.set('page', filter.halaman);

  const { data, meta } = await ambilDaftarLaporan(query);

  return <PapanRekap laporan={data} meta={meta} />;
}
