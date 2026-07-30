'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface OpsiSelect {
  nilai: string;
  label: string;
}

interface SelectProps {
  id?: string;
  label?: string;
  opsi: OpsiSelect[];
  nilai: string;
  onUbah: (nilai: string) => void;
  /** Teks saat belum ada yang dipilih. */
  placeholder?: string;
  galat?: string;
  bantuan?: string;
  wajib?: boolean;
  nonaktif?: boolean;
  ukuran?: 'sm' | 'md';
  className?: string;
}

/**
 * Pilihan tunggal dari daftar pendek (Radix Select).
 *
 * Dipakai bila pilihannya ≤ 10 dan tidak perlu disaring dengan mengetik.
 * Untuk daftar panjang seperti supplier atau LOT, pakai `Combobox`
 * (standar interaksi §1.1).
 */
export function Select({
  id,
  label,
  opsi,
  nilai,
  onUbah,
  placeholder = 'Pilih...',
  galat,
  bantuan,
  wajib = false,
  nonaktif = false,
  ukuran = 'md',
  className,
}: SelectProps) {
  const idBantuan = bantuan && !galat ? `${id}-bantuan` : undefined;
  const idGalat = galat ? `${id}-galat` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {wajib && (
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}

      <RadixSelect.Root value={nilai} onValueChange={onUbah} disabled={nonaktif}>
        <RadixSelect.Trigger
          id={id}
          aria-invalid={galat ? true : undefined}
          aria-describedby={[idBantuan, idGalat].filter(Boolean).join(' ') || undefined}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-input border border-line bg-surface px-2.5',
            'text-left text-body-lg text-ink transition-colors duration-fast',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft',
            'data-[placeholder]:text-ink-soft',
            galat && 'border-danger focus:border-danger focus:ring-danger/30',
            ukuran === 'sm' ? 'h-input-sm text-body' : 'h-input',
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown aria-hidden="true" className="size-4 text-ink-soft" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className={cn(
              'z-50 max-h-64 min-w-[--radix-select-trigger-width] overflow-hidden',
              'rounded-card border border-line bg-surface p-1 shadow-modal',
              'data-[state=open]:animate-popover-masuk',
            )}
          >
            <RadixSelect.Viewport>
              {opsi.map((item) => (
                <RadixSelect.Item
                  key={item.nilai}
                  value={item.nilai}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-control px-2 py-1.5',
                    'text-body-lg text-ink outline-none',
                    'data-[highlighted]:bg-surface-muted data-[state=checked]:bg-primary-subtle',
                  )}
                >
                  <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check aria-hidden="true" className="size-4 text-primary-text" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {bantuan && !galat && (
        <span id={idBantuan} className="mt-1 block text-caption text-ink-soft">
          {bantuan}
        </span>
      )}
      {galat && (
        <span id={idGalat} role="alert" className="field-error">
          {galat}
        </span>
      )}
    </div>
  );
}
