'use client';

import {
  Button,
  ComboBox as AriaComboBox,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Text,
} from 'react-aria-components';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface OpsiCombobox {
  id: string | number;
  label: string;
  /** Baris kedua pada daftar pilihan, mis. kode atau departemen. */
  keterangan?: string;
}

interface ComboboxProps {
  label: string;
  opsi: OpsiCombobox[];
  nilai: OpsiCombobox | null;
  onUbah: (nilai: OpsiCombobox | null) => void;
  placeholder?: string;
  galat?: string;
  bantuan?: string;
  wajib?: boolean;
  nonaktif?: boolean;
}

/**
 * Pilihan dari master data dengan penyaringan ketik (standar interaksi §1.1).
 *
 * Memakai React Aria ComboBox: Radix tidak menyediakan combobox — `Select`
 * miliknya tidak punya penyaringan ketik.
 *
 * Nilainya selalu terikat master data. Mengetik hanya menyaring, tidak pernah
 * membuat data baru — itu yang membedakannya dari input teks bebas.
 */
export function Combobox({
  label,
  opsi,
  nilai,
  onUbah,
  placeholder,
  galat,
  bantuan,
  wajib = false,
  nonaktif = false,
}: ComboboxProps) {
  return (
    <AriaComboBox
      items={opsi}
      selectedKey={nilai?.id ?? null}
      onSelectionChange={(kunci) =>
        onUbah(kunci === null ? null : (opsi.find((o) => o.id === kunci) ?? null))
      }
      isDisabled={nonaktif}
      isRequired={wajib}
      isInvalid={Boolean(galat)}
      menuTrigger="focus"
      className="flex flex-col"
    >
      <Label className="field-label">
        {label}
        {wajib && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Label>

      <div className="relative">
        <Input
          placeholder={placeholder}
          className={cn(
            'field pr-8',
            galat && 'border-danger focus:border-danger focus:ring-danger/30',
          )}
        />
        <Button
          aria-label="Buka daftar pilihan"
          className="absolute right-0 top-0 grid h-full w-8 place-items-center text-ink-soft transition-colors duration-fast hover:text-ink"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {bantuan && !galat && (
        <Text slot="description" className="mt-1 text-caption text-ink-soft">
          {bantuan}
        </Text>
      )}

      <FieldError className="field-error">{galat}</FieldError>

      <Popover
        className={cn(
          'w-[--trigger-width] overflow-auto rounded-card border border-line bg-surface p-1 shadow-modal',
          'max-h-64 data-[entering]:animate-popover-masuk',
        )}
      >
        <ListBox
          renderEmptyState={() => (
            <p className="px-2 py-3 text-center text-body text-ink-soft">Tidak ada yang cocok</p>
          )}
          className="outline-none"
        >
          {(item: OpsiCombobox) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-control px-2 py-1.5 outline-none',
                'data-[focused]:bg-surface-muted data-[selected]:bg-primary-subtle',
              )}
            >
              {({ isSelected }) => (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-lg text-ink">{item.label}</span>
                    {item.keterangan && (
                      <span className="block text-caption text-ink-soft">{item.keterangan}</span>
                    )}
                  </span>
                  {isSelected && (
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
                  )}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
