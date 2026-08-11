import { ambilRekap, queryAnalitik, type FilterAnalitik } from '@/lib/analitik-server';
import { PapanRekap } from './papan-rekap';

export const metadata = { title: 'Rekap Daily Activity — DAMS' };

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik>;
}) {
  const data = await ambilRekap(queryAnalitik(await searchParams));

  return <PapanRekap data={data} />;
}
