import { ambilProduktivitas, queryAnalitik } from '@/lib/analitik-server';
import { PapanProduktivitas } from './papan-produktivitas';

interface Params {
  dari?: string;
  sampai?: string;
  departemen?: string;
  metrik?: string;
}

export default async function ProduktivitasPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const filter = await searchParams;
  const data = await ambilProduktivitas(queryAnalitik(filter));

  return <PapanProduktivitas data={data} />;
}
