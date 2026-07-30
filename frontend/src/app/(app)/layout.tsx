import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { penggunaSaatIni } from '@/lib/session';

/**
 * Kerangka aplikasi: Horizontal Top Navigation Bar + isi halaman.
 * Berlaku untuk semua halaman kecuali Login (standar §2.3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const pengguna = await penggunaSaatIni();

  // Middleware hanya memeriksa keberadaan cookie. Di sini sesi diverifikasi ke
  // backend, sehingga token kedaluwarsa atau dicabut tetap tertahan.
  if (pengguna === null) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        pengguna={{
          nama: pengguna.nama,
          role: pengguna.role,
          namaRole: pengguna.namaRole,
          departemen: pengguna.departemen,
        }}
      />
      <main className="mx-auto max-w-container px-4 py-4 lg:px-8">{children}</main>
    </div>
  );
}
