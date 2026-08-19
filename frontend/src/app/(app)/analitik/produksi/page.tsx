import { ambilProduksi } from '@/lib/analitik-server';
import { PapanProsesProduksi } from './papan-proses-produksi';

export default async function ProduksiPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode } = await searchParams;
  const data = await ambilProduksi(periode ?? '');

  return <PapanProsesProduksi data={data} />;
}
