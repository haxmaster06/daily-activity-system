import { ambilProduksi } from '@/lib/analitik-server';
import { PapanProsesProduksi } from './papan-proses-produksi';

export default async function ProduksiPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; pengguna?: string }>;
}) {
  const { periode, pengguna } = await searchParams;
  const data = await ambilProduksi(periode ?? '', pengguna);

  return <PapanProsesProduksi data={data} />;
}
