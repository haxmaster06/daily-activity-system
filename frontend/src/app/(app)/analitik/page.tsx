import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { ambilAnalitik } from '@/lib/analitik-server';
import { wajibAkses } from '@/lib/session';
import { PapanAnalitik } from './papan-analitik';

export const metadata = { title: 'Executive Analytics — DAMS' };

export default async function AnalitikPage() {
  await wajibAkses('/analitik');

  const data = await ambilAnalitik();

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Executive Analytics' }]} />
      <PageHeader
        judul="Executive Analytics"
        keterangan="Ringkasan visual progres dan kepatuhan pada seluruh jangkauan data Anda."
      />

      <PapanAnalitik data={data} />
    </>
  );
}
