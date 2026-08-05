'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { I18nProvider, RouterProvider } from 'react-aria-components';

import { pasangBahasaReactAria } from '@/lib/react-aria-bahasa';

/*
 * Dipanggil saat modul dimuat, bukan di dalam efek.
 *
 * React Aria menghitung daftar paket kamusnya sekali lalu menyimpannya
 * selamanya. Memasangnya di `useEffect` berarti terlambat — komponen React Aria
 * pertama sudah dirender lebih dulu, kamusnya sudah terkunci pada bahasa
 * Inggris, dan tidak ada cara mengembalikannya tanpa memuat ulang halaman.
 */
pasangBahasaReactAria();

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;
  }
}

/**
 * Penyedia perilaku untuk komponen React Aria.
 *
 * `RouterProvider` membuat tautan di dalam komponen React Aria memakai
 * navigasi Next.js, bukan memuat ulang halaman penuh.
 *
 * `I18nProvider` dengan locale `id-ID` mengatur nama bulan dan hari pada
 * Calendar dan DatePicker, serta urutan hari dalam seminggu (standarisasi §26).
 */
export function UiProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <I18nProvider locale="id-ID">
      <RouterProvider navigate={router.push}>{children}</RouterProvider>
    </I18nProvider>
  );
}
