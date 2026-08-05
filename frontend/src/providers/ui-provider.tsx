'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { I18nProvider, RouterProvider } from 'react-aria-components';

import { pasangBahasaReactAria } from '@/lib/react-aria-bahasa';

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

  /*
   * Kamus Bahasa Indonesia dipasang **sesudah hidrasi**, bukan saat modul
   * dimuat — dan itu keputusan yang lahir dari cacat sungguhan.
   *
   * `getGlobalDictionaryForPackage()` mengembalikan null bila `window` tidak
   * ada, sehingga **server selalu memakai bahasa Inggris**. Memasang kamus
   * sebelum render pertama di peramban membuat keduanya berbeda, dan React
   * melaporkannya sebagai ketidakcocokan hidrasi. Yang benar-benar terjadi:
   *
   *     aria-valuetext="Empty"    ← server
   *     aria-valuetext="Kosong"   ← klien
   *
   * pada segmen tanggal kosong milik DatePicker — dan segmen itu memang
   * dirender sejak SSR, bukan hanya di dalam overlay.
   *
   * Dipasang di efek, render pertama peramban sama persis dengan server,
   * sehingga hidrasinya bersih. Teks React Aria yang benar-benar bermasalah —
   * tombol Tutup pada Popover, tombol dan sel kalender — seluruhnya baru
   * dirender saat pengguna membukanya, yaitu jauh sesudah efek ini berjalan,
   * sehingga tetap Bahasa Indonesia.
   *
   * Yang tersisa berbahasa Inggris hanyalah `aria-valuetext` segmen tanggal
   * yang masih kosong dan belum tersentuh sama sekali. Begitu diisi, nilainya
   * bukan lagi "Empty".
   *
   * Sengaja **tidak** memaksa render ulang seluruh pohon setelah pemasangan:
   * biayanya satu render penuh tiap pemuatan halaman, untuk mengganti satu
   * atribut pada isian yang belum disentuh.
   */
  useEffect(() => {
    pasangBahasaReactAria();
  }, []);

  return (
    <I18nProvider locale="id-ID">
      <RouterProvider navigate={router.push}>{children}</RouterProvider>
    </I18nProvider>
  );
}
