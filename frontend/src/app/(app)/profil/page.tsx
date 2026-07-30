import { SegeraHadir } from '@/components/layout/segera-hadir';

export const metadata = { title: 'Profil Saya — DAMS' };

export default function ProfilPage() {
  return (
    <SegeraHadir
      judul="Profil Saya"
      jejak={[{ label: 'Profil Saya' }]}
      keterangan="Perubahan data diri dan kata sandi dikerjakan pada tahap berikutnya."
    />
  );
}
