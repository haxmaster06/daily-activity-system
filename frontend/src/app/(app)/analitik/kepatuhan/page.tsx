import { ambilKepatuhan, queryAnalitik } from '@/lib/analitik-server';
import { PapanKepatuhan } from './papan-kepatuhan';

interface Params {
  dari?: string;
  sampai?: string;
  departemen?: string;
}

export default async function KepatuhanPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const filter = await searchParams;
  const data = await ambilKepatuhan(queryAnalitik(filter));

  return <PapanKepatuhan data={data} />;
}
