import {
  ambilRingkasan,
  queryAnalitik,
  type FilterAnalitik,
} from '@/lib/analitik-server';
import { PapanRingkasan } from './papan-ringkasan';

export default async function RingkasanPage({
  searchParams,
}: {
  searchParams: Promise<FilterAnalitik>;
}) {
  const filter = await searchParams;
  const data = await ambilRingkasan(queryAnalitik(filter));

  return <PapanRingkasan data={data} />;
}
