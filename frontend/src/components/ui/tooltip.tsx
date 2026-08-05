'use client';

import type { ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

import { useWadahOverlay } from '@/components/ui/wadah-overlay';
import { cn } from '@/lib/cn';

/**
 * Keterangan singkat yang muncul di atas pemicunya (Radix Tooltip).
 *
 * Berbeda dari `HoverCard`: tooltip untuk satu kalimat pendek, hover card untuk
 * isi yang lebih panjang dan dapat memuat tautan.
 *
 * **Isinya tidak boleh menjadi satu-satunya tempat sebuah informasi berada.**
 * Tooltip tidak terbaca pada layar sentuh dan mudah terlewat; ia menjelaskan
 * yang sudah terlihat, bukan menyembunyikan yang penting.
 *
 * Memakai Radix, bukan React Aria: tooltip Radix menerima pemicu apa pun lewat
 * `asChild`, termasuk sel tabel — dan itu yang dibutuhkan peta panas.
 */
export function Tooltip({
  isi,
  children,
  jeda = 200,
  sisi = 'top',
}: {
  isi: ReactNode;
  children: ReactNode;
  /** Milidetik sebelum muncul. */
  jeda?: number;
  sisi?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const wadahOverlay = useWadahOverlay();

  return (
    <RadixTooltip.Root delayDuration={jeda}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

      <RadixTooltip.Portal container={wadahOverlay}>
        <RadixTooltip.Content
          side={sisi}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-50 max-w-xs rounded-control bg-ink px-2 py-1.5 text-caption text-white shadow-modal',
            'animate-masuk-halus',
          )}
        >
          {isi}
          <RadixTooltip.Arrow className="fill-ink" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/**
 * Pembungkus yang wajib ada di atas kumpulan tooltip.
 *
 * Dipasang sekali per halaman, bukan per tooltip: `Provider` mengatur jeda
 * bersama sehingga tooltip kedua muncul seketika saat kursor berpindah — tanpa
 * itu, menyusuri peta panas berarti menunggu ulang di tiap sel.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  );
}
