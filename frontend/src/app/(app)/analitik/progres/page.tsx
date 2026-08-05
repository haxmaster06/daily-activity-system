import { ambilProgres, queryAnalitik } from '@/lib/analitik-server';
import { PapanProgres } from './papan-progres';

interface Params {
  dari?: string;
  sampai?: string;
  departemen?: string;
}

export default async function ProgresPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const filter = await searchParams;
  const data = await ambilProgres(queryAnalitik(filter));

  return <PapanProgres data={data} />;
}
