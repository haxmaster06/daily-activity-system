import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { PageTransition } from '@/components/ui/page-transition';
import { penggunaSaatIni } from '@/lib/session';

/**
 * Kerangka aplikasi: Horizontal Top Navigation Bar + isi halaman.
 * Berlaku untuk semua halaman kecuali Login (standar §2.3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const pengguna = await penggunaSaatIni();

  /*
   * Middleware hanya memeriksa keberadaan cookie. Di sini sesi diverifikasi ke
   * backend, sehingga token kedaluwarsa atau dicabut tetap tertahan.
   *
   * Tujuannya bukan /login melainkan Route Handler pembersih cookie: Server
   * Component tidak boleh menghapus cookie, dan mengarahkan langsung ke /login
   * sementara cookie basi masih terpasang akan dilempar balik oleh middleware.
   */
  if (pengguna === null) {
    redirect('/api/auth/sesi-berakhir');
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        pengguna={{
          id: pengguna.id,
          nama: pengguna.nama,
          namaRole: pengguna.namaRole,
          peranLain: Math.max(0, pengguna.penetapan.length - 1),
          // Array, bukan Set — nilainya menyeberang batas Server ke Client.
          izin: pengguna.izin,
          departemen: pengguna.departemen,
        }}
      />
      {/* pb-20 di layar sempit memberi ruang untuk Dock yang menempel di bawah. */}
      <main className="mx-auto max-w-container px-4 pb-20 pt-4 md:pb-4 lg:px-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
