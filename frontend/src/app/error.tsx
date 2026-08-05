'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { HalamanGalat } from '@/components/layout/halaman-galat';

/**
 * Batas galat untuk halaman di luar aplikasi — halaman masuk dan sejenisnya.
 */
export default function GalatUmum({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-background">
      <HalamanGalat
        judul="Terjadi gangguan"
        pesan="Halaman ini tidak dapat ditampilkan saat ini. Coba muat ulang; bila masih sama, sampaikan kode di bawah kepada pengelola sistem."
        kode={error.digest}
        aksi={
          <>
            <button type="button" onClick={reset} className="btn-primary btn-sm">
              Coba Lagi
            </button>
            <Link href="/login" className="btn-ghost btn-sm">
              Ke Halaman Masuk
            </Link>
          </>
        }
      />
    </main>
  );
}
