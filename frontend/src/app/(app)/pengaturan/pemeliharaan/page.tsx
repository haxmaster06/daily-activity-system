import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { ambilStatusPemeliharaan } from '@/lib/pemeliharaan';
import { wajibAkses } from '@/lib/session';
import { KontrolPemeliharaan } from './kontrol-pemeliharaan';

export const metadata = { title: 'Mode Pemeliharaan — DAMS' };

export default async function PemeliharaanPage() {
  await wajibAkses('/pengaturan/pemeliharaan');

  const status = await ambilStatusPemeliharaan();

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Mode Pemeliharaan' }]}
      />
      <PageHeader
        judul="Mode Pemeliharaan"
        keterangan="Menutup akses pengguna sementara saat sistem sedang diperbaiki."
      />

      <KontrolPemeliharaan awal={status} />
    </>
  );
}
