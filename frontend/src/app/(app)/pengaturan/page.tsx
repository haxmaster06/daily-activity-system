import { SegeraHadir } from '@/components/layout/segera-hadir';
import { wajibAkses } from '@/lib/session';

export const metadata = { title: 'Pengaturan — DAMS' };

export default async function PengaturanPage() {
  await wajibAkses('/pengaturan');

  return (
    <SegeraHadir
      judul="Pengaturan"
      jejak={[{ label: 'Pengaturan' }]}
      keterangan="Manajemen pengguna, departemen, dan template laporan dikerjakan pada tahap berikutnya."
    />
  );
}
