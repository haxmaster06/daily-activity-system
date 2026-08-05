import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { melihatOrangLain } from '@/lib/izin';
import { ambilDaftarLaporan } from '@/lib/laporan-server';
import { penggunaSaatIni } from '@/lib/session';
import { ambilTemplate } from '@/lib/template-server';
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
  if (pengguna === null) redirect(RUTE_SESI_BERAKHIR);

  const filter = await searchParams;

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.status) query.set('status', filter.status);
  if (filter.halaman) query.set('page', filter.halaman);

  const { data, meta } = await ambilDaftarLaporan(query);

  /*
   * Template yang boleh dipakai import. Backend menolak template departemen
   * lain, tetapi menawarkannya lebih dulu lalu menolak setelah pengguna
   * mengunggah berkasnya adalah cara yang buruk untuk menyampaikan aturan yang
   * sudah diketahui sejak awal.
   */
  const templateImport = (await ambilTemplate(new URLSearchParams({ aktif: '1' })))
    .filter(
      (satu) =>
        satu.departemen === null ||
        satu.departemen === undefined ||
        satu.departemen.id === pengguna.departemenId,
    )
    .map((satu) => ({ id: satu.id, nama: satu.nama }));

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
        templateImport={templateImport}
      />
    </>
  );
}
