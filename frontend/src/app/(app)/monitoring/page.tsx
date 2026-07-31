import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { bolehMenyaringDepartemen } from '@/lib/izin';
import { denganPenyaringanAman } from '@/lib/penyaringan';
import { ambilRingkasanMonitoring } from '@/lib/ringkasan-server';
import { wajibAkses } from '@/lib/session';
import { TabelMonitoring } from './tabel-monitoring';

export const metadata = { title: 'Monitoring Tim — DAMS' };

interface Params {
  cari?: string;
  departemen_id?: string;
  dari?: string;
  sampai?: string;
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const pengguna = await wajibAkses('/monitoring');
  const filter = await searchParams;

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.departemen_id) query.set('departemen_id', filter.departemen_id);
  if (filter.dari) query.set('dari', filter.dari);
  if (filter.sampai) query.set('sampai', filter.sampai);

  /*
   * Pemilih departemen hanya berguna bila ada lebih dari satu untuk dipilih.
   * Pemantau satu departemen tidak ditawari pilihan yang jawabannya sudah
   * pasti; backend pun menolak departemen di luar jangkauannya.
   */
  const dapatPilihDepartemen = bolehMenyaringDepartemen(pengguna.jangkauan);

  const [ringkasan, departemen] = await Promise.all([
    denganPenyaringanAman(query, ambilRingkasanMonitoring),
    dapatPilihDepartemen ? ambilDepartemen() : Promise.resolve([]),
  ]);

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Monitoring' }]} />
      <TabelMonitoring
        ringkasan={ringkasan.data}
        peringatan={ringkasan.peringatan}
        departemen={departemen}
        dapatPilihDepartemen={dapatPilihDepartemen}
        penggunaId={pengguna.id}
      />
    </>
  );
}
