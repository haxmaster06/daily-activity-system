'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Tempat komponen popup Radix menaruh isinya.
 *
 * Masalah yang diselesaikan: Radix mem-portal isi Select, DropdownMenu, dan
 * HoverCard ke `document.body`. Bila komponen itu berada di dalam modal React
 * Aria yang `isDismissable`, klik pada daftar pilihan terbaca sebagai klik di
 * luar modal — modalnya ikut tertutup.
 *
 * React Aria versi ini tidak menyediakan `shouldCloseOnInteractOutside`, dan
 * penanda `data-react-aria-top-layer` hanya mengatur perpindahan fokus, bukan
 * penutupan. Karena itu jalan keluarnya adalah menaruh portal Radix di dalam
 * DOM modal, sehingga kliknya memang bukan klik di luar.
 *
 * Di luar modal nilainya `null`, dan Radix kembali memakai `document.body`
 * seperti biasa.
 */
const WadahOverlayContext = createContext<HTMLElement | null>(null);

export function WadahOverlayProvider({
  wadah,
  children,
}: {
  wadah: HTMLElement | null;
  children: ReactNode;
}) {
  return <WadahOverlayContext value={wadah}>{children}</WadahOverlayContext>;
}

/**
 * Elemen tempat portal Radix ditaruh, atau `null` untuk perilaku bawaan.
 *
 * Dipakai oleh tiap komponen Radix yang memakai portal.
 */
export function useWadahOverlay(): HTMLElement | undefined {
  return useContext(WadahOverlayContext) ?? undefined;
}
