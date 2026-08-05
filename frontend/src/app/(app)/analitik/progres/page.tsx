import {
  ambilProgres,
  queryAnalitik,
  type FilterAnalitik,
} from '@/lib/analitik-server';
import { PapanProgres } from './papan-progres';

export default async function ProgresPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik>;
}) {
  const filter = await searchParams;
  const data = await ambilProgres(queryAnalitik(filter));

  return <PapanProgres data={data} />;
}
