import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { SegeraHadir } from '@/components/ui/segera-hadir';
import { wajibAkses } from '@/lib/session';

export const metadata = { title: 'KPI — DAMS' };

export default async function KpiPage() {
  await wajibAkses('/kpi');

  return (
    <>
      <Breadcrumb jejak={[{ label: 'KPI' }]} />
      <PageHeader
        judul="KPI"
        keterangan="Indikator kinerja per departemen dan per peran."
      />

      <SegeraHadir
        judul="Segera hadir"
        keterangan="Indikator yang diukur, cara menghitungnya, dan siapa pemiliknya sedang dibahas bersama manajemen. Setelah itu disepakati, halaman ini yang menampilkannya."
      />
    </>
  );
}
