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
  /**
   * Dipanggil tiap kali isian diketik.
   *
   * Penyaringan adalah tugas pemanggil, bukan komponen ini: daftar master
   * dapat berisi ribuan baris dan tidak boleh dimuat seluruhnya ke peramban
   * (non-fungsional §15.3). Pemanggil mengambil hasilnya dari server lalu
   * mengirimkannya kembali lewat `opsi`.
   */
  onKetik?: (teks: string) => void;
  /** Ditampilkan menggantikan "Tidak ada yang cocok" selagi hasil diambil. */
  memuat?: boolean;
  placeholder?: string;
  galat?: string;
  bantuan?: string;
  wajib?: boolean;
  nonaktif?: boolean;
  tanpaLabel?: boolean;
  ukuran?: 'sm' | 'md';
}

/**
 * Pilihan dari daftar master dengan penyaringan ketik (standar §1.1).
 *
 * Memakai React Aria ComboBox: Radix tidak menyediakan combobox — `Select`
 * miliknya tidak punya penyaringan ketik.
 *
 * Nilainya selalu terikat daftar master. Mengetik hanya menyaring, tidak pernah
 * membuat data baru — itu yang membedakannya dari input teks bebas.
 *
 * **Komponen ini tidak menyaring sendiri.** `opsi` ditampilkan apa adanya.
 * Dengan `items` terkendali, React Aria memang menyerahkan penyaringan kepada
 * pemanggil, dan itu justru yang dibutuhkan di sini: hasilnya datang dari
 * server, dan menyaring ulang di peramban akan menyembunyikan baris yang baru
 * saja dikirim server.
 */
export function Combobox({
  label,
  opsi,
  nilai,
  onUbah,
  onKetik,
  memuat = false,
  placeholder,
  galat,
  bantuan,
  wajib = false,
  nonaktif = false,
  tanpaLabel = false,
  ukuran = 'md',
}: ComboboxProps) {
  return (
    <AriaComboBox
      items={opsi}
      selectedKey={nilai?.id ?? null}
      onSelectionChange={(kunci) =>
        onUbah(kunci === null ? null : (opsi.find((o) => o.id === kunci) ?? null))
      }
      onInputChange={onKetik}
      // Nilai yang sudah dipilih tetap terbaca walau tidak ada di `opsi` —
      // daftar dari server hanya memuat hasil pencarian terakhir.
      allowsEmptyCollection
      isDisabled={nonaktif}
      isRequired={wajib}
      isInvalid={Boolean(galat)}
      menuTrigger="focus"
      className="flex flex-col"
    >
      {/*
        Label dapat disembunyikan untuk pemakaian di dalam sel tabel, tempat
        judul kolomnya sudah menjadi label. Tetap dirender bagi pembaca layar —
        yang hilang hanya tampilannya.
      */}
      <Label className={tanpaLabel ? 'sr-only' : 'field-label'}>
        {label}
        {wajib && !tanpaLabel && (
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
            ukuran === 'sm' ? 'field field-sm' : 'field',
            'pr-8',
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
          'w-[--trigger-width] overflow-hidden rounded-card border border-line bg-surface shadow-modal',
          'data-[entering]:animate-popover-masuk',
        )}
      >
        {/*
          Yang menggulir adalah ListBox, bukan Popover. React Aria menggulirkan
          item yang sedang disorot ke dalam pandangan lewat elemen ini — bila
          gulirnya dipasang di Popover, navigasi papan ketik tidak mengikuti.
        */}
        <ListBox
          renderEmptyState={() => (
            <p className="px-2 py-3 text-center text-body text-ink-soft">
              {memuat ? 'Mencari...' : 'Tidak ada yang cocok'}
            </p>
          )}
          className="max-h-64 overflow-y-auto overscroll-contain p-1 outline-none"
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
