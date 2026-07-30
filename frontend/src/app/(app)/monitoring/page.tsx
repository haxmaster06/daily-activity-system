import { SegeraHadir } from '@/components/layout/segera-hadir';
import { wajibAkses } from '@/lib/session';

export const metadata = { title: 'Monitoring — DAMS' };

export default async function MonitoringPage() {
  await wajibAkses('/monitoring');

  return (
    <SegeraHadir
      judul="Monitoring Tim"
      jejak={[{ label: 'Monitoring' }]}
      keterangan="Pemantauan laporan anggota departemen dikerjakan pada tahap berikutnya."
    />
  );
}
