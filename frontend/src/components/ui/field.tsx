import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Pembungkus satu isian form (pola `Field` milik shadcn).
 *
 * Menyatukan label, isian, teks bantuan, dan pesan galat dalam satu susunan
 * yang sama di seluruh aplikasi, sekaligus menyambungkan `aria-describedby`
 * supaya pembaca layar membacakan bantuan dan galatnya.
 *
 * Dipakai untuk isian biasa. Komponen React Aria (ComboBox, DatePicker) sudah
 * membawa label dan pesan galatnya sendiri.
 */
export function Field({
  id,
  label,
  bantuan,
  galat,
  wajib = false,
  children,
  className,
}: {
  /** Harus sama dengan `id` pada elemen isian di dalamnya. */
  id: string;
  label: string;
  bantuan?: string;
  galat?: string;
  wajib?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const idBantuan = bantuan ? `${id}-bantuan` : undefined;
  const idGalat = galat ? `${id}-galat` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {wajib && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      {children}

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

/**
 * Menyusun atribut aksesibilitas untuk elemen isian di dalam `Field`.
 *
 * Dipakai agar tiap pemakaian tidak menulis ulang `aria-describedby` dan
 * `aria-invalid` — mudah terlupa, dan galat yang tidak tersambung tidak
 * terbaca pembaca layar.
 */
export function atributField(id: string, opsi: { bantuan?: string; galat?: string } = {}) {
  const deskripsi = [opsi.bantuan ? `${id}-bantuan` : null, opsi.galat ? `${id}-galat` : null]
    .filter(Boolean)
    .join(' ');

  return {
    id,
    'aria-invalid': opsi.galat ? true : undefined,
    'aria-describedby': deskripsi || undefined,
  } as const;
}

/** Susunan beberapa Field dalam satu baris pada layar lebar. */
export function FieldGroup({
  children,
  kolom = 2,
  className,
}: {
  children: ReactNode;
  kolom?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        kolom === 2 && 'sm:grid-cols-2',
        kolom === 3 && 'sm:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
