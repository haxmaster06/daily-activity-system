import Link from 'next/link';

import { HalamanGalat } from '@/components/layout/halaman-galat';

export const metadata = { title: 'Tidak Ditemukan — DAMS' };

/**
 * Tidak ditemukan, di dalam aplikasi.
 *
 * Terpisah dari `not-found.tsx` di akar supaya bilah navigasi tetap terpasang
 * dan pengguna dapat langsung berpindah halaman. Dipakai juga untuk data yang
 * ada tetapi bukan haknya — keberadaan sebuah laporan pun bukan informasi yang
 * perlu dibocorkan.
 */
export default function TidakDitemukanAplikasi() {
  return (
    <HalamanGalat
      judul="Data tidak ditemukan"
      pesan="Data yang Anda buka tidak ada, sudah dihapus, atau bukan bagian dari yang boleh Anda lihat."
      aksi={
        <>
          <Link href="/laporan" className="btn-primary btn-sm">
            Ke Daftar Laporan
          </Link>
          <Link href="/dashboard" className="btn-ghost btn-sm">
            Ke Dashboard
          </Link>
        </>
      }
    />
  );
}
