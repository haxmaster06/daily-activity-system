'use client';

import { useState, type ReactNode } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';

import { WadahOverlayProvider } from '@/components/ui/wadah-overlay';
import { cn } from '@/lib/cn';

/**
 * Panel yang muncul dari sebuah tombol (Radix Popover).
 *
 * Dipakai untuk isian yang tidak perlu tampil sepanjang waktu — penyaringan,
 * pilihan lanjutan — sehingga layar tidak dipenuhi kontrol yang jarang
 * disentuh.
 *
 * ## Mengapa isinya dibungkus `WadahOverlayProvider`
 *
 * DAMS memakai dua pustaka overlay sekaligus: Radix dan React Aria. Komponen
 * React Aria di dalam popover ini — DatePicker, Combobox — memasang panelnya
 * sendiri ke `document.body`, yaitu **di luar** isi popover. Radix membaca klik
 * di sana sebagai "klik di luar" lalu menutup dirinya sendiri, tepat saat
 * pengguna memilih tanggal.
 *
 * Cacat yang sama bentuknya sudah pernah terjadi pada `Modal` dan
 * diselesaikan dengan cara yang sama: simpul popover disediakan sebagai wadah
 * portal, sehingga panel di dalamnya benar-benar berada di dalam popover.
 *
 * Sebagai lapis kedua, `onInteractOutside` mengabaikan interaksi yang berasal
 * dari overlay React Aria yang tetap lolos ke `document.body` — komponen yang
 * belum membaca wadah portal masih ada.
 */
export function Popover({
  label,
  ringkasan,
  children,
  align = 'start',
  lebar = 'w-80',
  aktif = false,
  Ikon,
}: {
  /** Dibacakan pembaca layar; tidak tampil sebagai teks. */
  label: string;
  /** Teks pada tombol — menyebutkan pilihan yang sedang berlaku. */
  ringkasan: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  lebar?: string;
  /** Menandai penyaring ini sedang mengubah hasil. */
  aktif?: boolean;
  Ikon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  const [simpul, setSimpul] = useState<HTMLElement | null>(null);

  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger
        aria-label={label}
        className={cn(
          'inline-flex h-input-sm items-center gap-1.5 rounded-control border px-2.5 text-body transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          aktif
            ? 'border-primary bg-primary-subtle font-medium text-primary-text'
            : 'border-line bg-surface text-ink-muted hover:bg-surface-muted',
        )}
      >
        {Ikon && <Ikon aria-hidden className="size-3.5 shrink-0" />}
        {ringkasan}
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={setSimpul}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          onInteractOutside={(peristiwa) => {
            const sasaran = peristiwa.target as HTMLElement | null;

            // Lapis kedua; lihat catatan di atas.
            if (sasaran?.closest('[data-rac], [role="application"]')) {
              peristiwa.preventDefault();
            }
          }}
          className={cn(
            'z-40 rounded-card border border-line bg-surface p-3 shadow-modal',
            'animate-popover-masuk',
            lebar,
          )}
        >
          <WadahOverlayProvider wadah={simpul}>{children}</WadahOverlayProvider>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
