import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { penggunaSaatIni } from '@/lib/session';
import { ambilTemplate } from '@/lib/template-server';
import { FormLaporan } from './form-laporan';

export const metadata = { title: 'Buat Laporan — DAMS' };

export default async function BuatLaporanPage() {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect(RUTE_SESI_BERAKHIR);

  /*
   * Hanya template departemen pengguna dan yang berlaku umum. Backend
   * menolak template departemen lain, tetapi menawarkannya di antarmuka pun
   * sudah salah — pengguna tidak seharusnya melihat pilihan yang akan ditolak.
   */
  const query = new URLSearchParams({ dengan_kolom: '1', hanya_aktif: '1' });
  if (pengguna.departemenId !== null) {
    query.set('departemen_id', String(pengguna.departemenId));
  }

  const template = await ambilTemplate(query);

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Laporan Saya', href: '/laporan' }, { label: 'Buat Laporan' }]}
      />
      <PageHeader judul="Buat Laporan Harian" />
      <FormLaporan templateTersedia={template} />
    </>
  );
}
