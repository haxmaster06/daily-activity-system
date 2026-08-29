import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { bolehMenyaringDepartemen, melihatOrangLain } from '@/lib/izin';
import { ambilDaftarLaporan } from '@/lib/laporan-server';
import { ambilDepartemen } from '@/lib/master-data';
import { penggunaSaatIni } from '@/lib/session';
import { ambilTemplate } from '@/lib/template-server';
import { DaftarLaporan } from './daftar-laporan';

export const metadata = { title: 'Laporan Harian — DAMS' };

interface Params {
  cari?: string;
  status?: string;
  dari?: string;
  sampai?: string;
  departemen_id?: string;
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

  /*
   * Pemilih departemen hanya berguna bila jangkauannya lebih dari satu. Backend
   * pun menolak departemen di luar jangkauan, jadi menyaring dengannya untuk
   * pemantau satu departemen hanya menawarkan pilihan yang jawabannya pasti.
   */
  const dapatPilihDepartemen = bolehMenyaringDepartemen(pengguna.jangkauan);

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.status) query.set('status', filter.status);
  if (filter.dari) query.set('dari', filter.dari);
  if (filter.sampai) query.set('sampai', filter.sampai);
  if (dapatPilihDepartemen && filter.departemen_id) {
    query.set('departemen_id', filter.departemen_id);
  }
  if (filter.halaman) query.set('page', filter.halaman);

  const [{ data, meta }, departemen] = await Promise.all([
    ambilDaftarLaporan(query),
    dapatPilihDepartemen ? ambilDepartemen() : Promise.resolve([]),
  ]);

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
      <Breadcrumb jejak={[{ label: 'Laporan Harian' }]} />
      <DaftarLaporan
        laporan={data}
        meta={meta}
        tampilkanPenyusun={melihatLaporanOrangLain}
        judul={melihatLaporanOrangLain ? 'Laporan' : 'Laporan Harian'}
        templateImport={templateImport}
        departemen={departemen}
        dapatPilihDepartemen={dapatPilihDepartemen}
      />
    </>
  );
}
