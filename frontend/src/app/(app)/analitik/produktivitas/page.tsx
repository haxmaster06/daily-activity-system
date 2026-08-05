import {
  ambilProduktivitas,
  queryAnalitik,
  type FilterAnalitik,
} from '@/lib/analitik-server';
import { PapanProduktivitas } from './papan-produktivitas';

export default async function ProduktivitasPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik>;
}) {
  const filter = await searchParams;
  const data = await ambilProduktivitas(queryAnalitik(filter));

  return <PapanProduktivitas data={data} />;
}
