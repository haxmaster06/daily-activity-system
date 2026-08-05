import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { PageTransition } from '@/components/ui/page-transition';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
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
   * Penjaga ini TIDAK menggantikan pemeriksaan di tiap halaman. Layout hanya
   * dijalankan ulang pada pemuatan penuh; berpindah antar halaman di dalam
   * grup ini memakai kerangka yang sudah terpasang, sehingga sesi yang berakhir
   * di tengah pemakaian tidak akan pernah sampai ke sini. Setiap halaman
   * memeriksanya sendiri — sudah terbukti lewat percobaan, bukan dugaan.
   */
  if (pengguna === null) {
    redirect(RUTE_SESI_BERAKHIR);
  }

  return (
    // `dvh`, bukan `vh`: di ponsel `100vh` menghitung bilah alamat yang
    // menghilang saat digulir, sehingga halaman lebih tinggi daripada layarnya.
    <div className="min-h-dvh bg-background">
      {/*
        Persinggahan pertama bagi pengguna papan ketik. Tanpa ini, mencapai isi
        halaman menuntut menelusuri seluruh navigasi lebih dulu — tiap kali
        halaman berganti.

        Tersembunyi sampai difokus; `sr-only` dilepas oleh `focus:not-sr-only`.
      */}
      <a
        href="#isi-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-surface focus:px-3 focus:py-2 focus:text-body focus:text-ink focus:shadow-modal"
      >
        Lewati ke isi halaman
      </a>

      <AppHeader
        pengguna={{
          id: pengguna.id,
          nama: pengguna.nama,
          foto: pengguna.foto,
          namaRole: pengguna.namaRole,
          peranLain: Math.max(0, pengguna.penetapan.length - 1),
          // Array, bukan Set — nilainya menyeberang batas Server ke Client.
          izin: pengguna.izin,
          departemen: pengguna.departemen,
        }}
      />
      {/* pb-20 di layar sempit memberi ruang untuk Dock yang menempel di bawah. */}
      <main
        id="isi-utama"
        tabIndex={-1}
        className="mx-auto max-w-container px-4 pb-20 pt-4 outline-none md:pb-4 lg:px-8"
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
