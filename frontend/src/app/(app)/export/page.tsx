import { SegeraHadir } from '@/components/layout/segera-hadir';

export const metadata = { title: 'Export — DAMS' };

export default function ExportPage() {
  return (
    <SegeraHadir
      judul="Export Laporan"
      jejak={[{ label: 'Export' }]}
      keterangan="Preview dan export laporan ke Excel atau PDF dikerjakan pada tahap berikutnya."
    />
  );
}
