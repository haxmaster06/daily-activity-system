'use client';

import type { ReactNode } from 'react';
import * as RadixHoverCard from '@radix-ui/react-hover-card';

import { cn } from '@/lib/cn';

/**
 * Kartu keterangan yang muncul saat kursor berhenti di atas pemicunya
 * (Radix HoverCard).
 *
 * Dipakai untuk keterangan yang terlalu panjang bagi tooltip tetapi tidak
 * layak jadi halaman tersendiri — mis. ringkasan laporan pada baris tabel,
 * atau penjelasan rumus kolom hitungan.
 *
 * Bukan pengganti tombol: isinya hanya keterangan. Perangkat sentuh tidak
 * punya hover, jadi informasi penting tidak boleh hanya ada di sini
 * (standarisasi §20).
 */
export function HoverCard({
  pemicu,
  children,
  lebar = 'sedang',
  sisi = 'top',
}: {
  pemicu: ReactNode;
  children: ReactNode;
  lebar?: 'sedang' | 'lebar';
  sisi?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <RadixHoverCard.Root openDelay={220} closeDelay={120}>
      <RadixHoverCard.Trigger asChild>{pemicu}</RadixHoverCard.Trigger>

      <RadixHoverCard.Portal>
        <RadixHoverCard.Content
          side={sisi}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 rounded-card border border-line bg-surface p-3 text-body text-ink-muted shadow-modal',
            'data-[state=open]:animate-popover-masuk',
            lebar === 'lebar' ? 'max-w-sm' : 'max-w-xs',
          )}
        >
          {children}
          <RadixHoverCard.Arrow className="fill-surface stroke-line" />
        </RadixHoverCard.Content>
      </RadixHoverCard.Portal>
    </RadixHoverCard.Root>
  );
}
