import Link from 'next/link';

import { HalamanGalat } from '@/components/layout/halaman-galat';

export const metadata = { title: 'Halaman Tidak Ditemukan — DAMS' };

/**
 * Halaman untuk alamat yang tidak dikenal.
 *
 * Tanpa ini, alamat yang salah ketik memunculkan halaman bawaan Next.js
 * berbahasa Inggris.
 */
export default function TidakDitemukan() {
  return (
    <main className="min-h-screen bg-background">
      <HalamanGalat
        judul="Halaman tidak ditemukan"
        pesan="Alamat yang Anda buka tidak ada, atau isinya sudah dipindahkan."
        aksi={
          <Link href="/dashboard" className="btn-primary btn-sm">
            Ke Dashboard
          </Link>
        }
      />
    </main>
  );
}
