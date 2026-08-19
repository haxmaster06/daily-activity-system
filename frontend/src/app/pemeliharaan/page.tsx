import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wrench } from 'lucide-react';

import { ambilStatusPemeliharaan } from '@/lib/pemeliharaan';

export const metadata = { title: 'Sedang Pemeliharaan — DAMS' };

/**
 * Halaman yang dilihat pengguna biasa saat mode pemeliharaan aktif. Berdiri
 * sendiri di luar kerangka aplikasi — tak ada navigasi yang perlu ditampilkan.
 */
export default async function HalamanPemeliharaan() {
  const status = await ambilStatusPemeliharaan();

  // Sudah selesai: jangan biarkan orang terjebak di halaman usang.
  if (!status.aktif) {
    redirect('/dashboard');
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-accent-subtle text-accent-text">
          <Wrench aria-hidden="true" className="size-7" />
        </span>
        <h1 className="text-page-title text-ink">Sedang Pemeliharaan</h1>
        <p className="mt-2 text-body-lg text-ink-muted">
          {status.pesan ?? 'Sistem sedang diperbarui. Silakan coba lagi beberapa saat lagi.'}
        </p>
        <Link href="/dashboard" className="btn-primary btn-sm mt-6">
          Coba Lagi
        </Link>
        <p className="mt-6 text-caption text-ink-soft">DAMS — CV Hasil Barokah Mandiri</p>
      </div>
    </main>
  );
}
