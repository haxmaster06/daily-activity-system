import { ambilKeadaanDepartemen, queryAnalitik } from '@/lib/analitik-server';
import { PapanDepartemen } from './departemen/papan-departemen';

interface Params {
  dari?: string;
  sampai?: string;
  departemen?: string;
}

export default async function DepartemenPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const filter = await searchParams;
  const data = await ambilKeadaanDepartemen(queryAnalitik(filter));

  return <PapanDepartemen data={data} />;
}
