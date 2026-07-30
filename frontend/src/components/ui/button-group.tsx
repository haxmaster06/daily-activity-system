'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';

import { cn } from '@/lib/cn';

export interface OpsiButtonGroup {
  nilai: string;
  label: string;
  /** Dibacakan pembaca layar bila labelnya berupa ikon. */
  keterangan?: string;
}

/**
 * Kelompok tombol pilihan tunggal (Radix ToggleGroup).
 *
 * Dipakai untuk pilihan pendek yang layak terlihat sekaligus — mis. rentang
 * waktu (Hari Ini / Minggu Ini / Bulan Ini) atau ragam tampilan. Pilihan yang
 * lebih dari lima memakai `Select`.
 *
 * Selalu ada satu yang terpilih: menekan tombol yang sudah aktif tidak
 * mengosongkan pilihan, karena keadaan "tidak ada yang dipilih" tidak punya
 * arti pada penyaringan.
 */
export function ButtonGroup({
  label,
  opsi,
  nilai,
  onUbah,
  ukuran = 'sm',
  className,
}: {
  /** Dibacakan pembaca layar sebagai nama kelompok. */
  label: string;
  opsi: OpsiButtonGroup[];
  nilai: string;
  onUbah: (nilai: string) => void;
  ukuran?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={nilai}
      onValueChange={(baru) => {
        if (baru) onUbah(baru);
      }}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border border-line bg-surface-muted p-0.5',
        className,
      )}
    >
      {opsi.map((item) => (
        <ToggleGroup.Item
          key={item.nilai}
          value={item.nilai}
          aria-label={item.keterangan}
          className={cn(
            'rounded-[4px] px-2.5 font-medium text-ink-muted transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            'hover:text-ink',
            'data-[state=on]:bg-surface data-[state=on]:text-primary-text data-[state=on]:shadow-card',
            ukuran === 'sm' ? 'h-7 text-body' : 'h-8 text-body-lg',
          )}
        >
          {item.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
