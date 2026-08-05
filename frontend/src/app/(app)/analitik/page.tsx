import {
  ambilKeadaanDepartemen,
  queryAnalitik,
  type FilterAnalitik,
} from '@/lib/analitik-server';
import { PapanDepartemen } from './departemen/papan-departemen';

export default async function DepartemenPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik>;
}) {
  const filter = await searchParams;
  const data = await ambilKeadaanDepartemen(queryAnalitik(filter));

  return <PapanDepartemen data={data} />;
}
