'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { HalamanGalat } from '@/components/layout/halaman-galat';

/**
 * Batas galat untuk halaman di dalam aplikasi.
 *
 * Bilah navigasi tetap terpasang karena batas ini berada di dalam layout,
 * sehingga pengguna tidak terdampar tanpa jalan keluar.
 */
export default function GalatAplikasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detail teknis hanya untuk konsol pengembang; pengguna melihat pesan biasa.
    console.error(error);
  }, [error]);

  return (
    <HalamanGalat
      judul="Halaman ini gagal dimuat"
      pesan="Terjadi gangguan saat mengambil datanya. Coba muat ulang; bila masih sama, sampaikan kode di bawah kepada pengelola sistem."
      kode={error.digest}
      aksi={
        <>
          <button type="button" onClick={reset} className="btn-primary btn-sm">
            Coba Lagi
          </button>
          <Link href="/dashboard" className="btn-ghost btn-sm">
            Ke Dashboard
          </Link>
        </>
      }
    />
  );
}
