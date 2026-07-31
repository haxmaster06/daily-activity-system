import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { melihatOrangLain } from '@/lib/izin';
import { ambilDaftarLaporan } from '@/lib/laporan-server';
import { penggunaSaatIni } from '@/lib/session';
import { DaftarLaporan } from './daftar-laporan';

export const metadata = { title: 'Laporan Saya — DAMS' };

interface Params {
  cari?: string;
  status?: string;
  halaman?: string;
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect('/api/auth/sesi-berakhir');

  const filter = await searchParams;

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.status) query.set('status', filter.status);
  if (filter.halaman) query.set('page', filter.halaman);

  const { data, meta } = await ambilDaftarLaporan(query);

  /*
   * Jangkauannya sudah dibatasi server lewat DailyReport::scopeVisibleTo().
   * Yang ditentukan di sini hanya penyebutan halamannya — Staff melihat
   * laporannya sendiri, atasan melihat laporan orang lain juga.
   */
  const melihatLaporanOrangLain = melihatOrangLain(pengguna.jangkauan);

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Laporan Saya' }]} />
      <DaftarLaporan
        laporan={data}
        meta={meta}
        tampilkanPenyusun={melihatLaporanOrangLain}
        judul={melihatLaporanOrangLain ? 'Laporan' : 'Laporan Saya'}
      />
    </>
  );
}
