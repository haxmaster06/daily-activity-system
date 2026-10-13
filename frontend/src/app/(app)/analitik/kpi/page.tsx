import { SegeraHadir } from '@/components/ui/segera-hadir';

export default function KpiAnalitikPage() {
  return (
    <SegeraHadir
      judul="KPI segera hadir"
      keterangan="Indikator kinerja akan tampil di sini setelah ukurannya disepakati bersama manajemen."
    >
      Penyaring rentang tanggal dan departemen di atas sudah berlaku untuk tab
      lain, dan akan berlaku sama untuk halaman ini.
    </SegeraHadir>
  );
}
