import { SegeraHadir } from '@/components/layout/segera-hadir';

export const metadata = { title: 'Laporan Saya — DAMS' };

export default function LaporanPage() {
  return (
    <SegeraHadir
      judul="Laporan Saya"
      jejak={[{ label: 'Laporan Saya' }]}
      keterangan="Pembuatan dan riwayat laporan harian dikerjakan pada tahap berikutnya."
    />
  );
}
