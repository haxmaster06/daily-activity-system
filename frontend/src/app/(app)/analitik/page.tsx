import { ambilRingkasan, queryAnalitik } from '@/lib/analitik-server';
import { PapanRingkasan } from './papan-ringkasan';

interface Params {
  dari?: string;
  sampai?: string;
  departemen?: string;
}

export default async function RingkasanPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const filter = await searchParams;
  const data = await ambilRingkasan(queryAnalitik(filter));

  return <PapanRingkasan data={data} />;
}
