import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { penggunaSaatIni } from '@/lib/session';

/**
 * Kerangka aplikasi: Horizontal Top Navigation Bar + isi halaman.
 * Berlaku untuk semua halaman kecuali Login (standar §2.3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const pengguna = await penggunaSaatIni();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        pengguna={{
          nama: pengguna.nama,
          role: pengguna.role,
          departemen: pengguna.departemen,
        }}
      />
      <main className="mx-auto max-w-container px-4 py-4 lg:px-8">{children}</main>
    </div>
  );
}
