import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { PenjagaVersi } from '@/components/layout/penjaga-versi';
import { PageTransition } from '@/components/ui/page-transition';
import { GalatApi } from '@/lib/api';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { ambilStatusPemeliharaan } from '@/lib/pemeliharaan';
import { penggunaSaatIni } from '@/lib/session';

/**
 * Kerangka aplikasi: Horizontal Top Navigation Bar + isi halaman.
 * Berlaku untuk semua halaman kecuali Login (standar §2.3).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  let pengguna;

  try {
    pengguna = await penggunaSaatIni();
  } catch (galat) {
    // Mode pemeliharaan aktif dan bukan administrator: backend membalas 503.
    // Layout dijalankan pada pemuatan penuh, jadi penjaga ini yang menangkap
    // kasus itu di sini (halaman di dalamnya juga memeriksanya sendiri).
    if (galat instanceof GalatApi && galat.status === 503 && Boolean(galat.errors?.pemeliharaan)) {
      redirect('/pemeliharaan');
    }

    throw galat;
  }

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

  // Hanya administrator yang sampai di sini saat pemeliharaan aktif; spanduknya
  // mengingatkan bahwa aplikasi sedang tertutup bagi pengguna lain.
  const pemeliharaan = await ambilStatusPemeliharaan();

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

      {pemeliharaan.aktif && (
        <div
          role="status"
          className="border-b border-accent/40 bg-accent-subtle px-4 py-1.5 text-center text-caption text-accent-text"
        >
          Mode pemeliharaan aktif — aplikasi tertutup bagi pengguna lain.{' '}
          <Link href="/pengaturan/pemeliharaan" className="font-medium underline">
            Kelola
          </Link>
        </div>
      )}

      <AppHeader
        pengguna={{
          id: pengguna.id,
          nama: pengguna.nama,
          foto: pengguna.foto,
          namaRole: pengguna.namaRole,
          peranLain: Math.max(0, pengguna.penetapan.length - 1),
          // Array, bukan Set — nilainya menyeberang batas Server ke Client.
          izin: pengguna.izin,
          bolehKelolaMaster: pengguna.bolehKelolaMaster,
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
        <PenjagaVersi />
      </main>
    </div>
  );
}
