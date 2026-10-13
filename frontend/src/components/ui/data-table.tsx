import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Kerangka tabel data (standar §21).
 *
 * - Header menempel saat badan digulir, dengan latar solid agar baris tidak
 *   menembusnya.
 * - Tinggi dibatasi; yang menggulir adalah badan tabel, bukan halaman.
 * - Tabel menggulir di dalam dirinya sendiri sehingga halaman tidak pernah
 *   menggulir mendatar (standar §23.1).
 */
export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // ~11 baris pada tinggi baris 34px + header
        'max-h-[26rem] overflow-auto rounded-t-card',
        className,
      )}
    >
      <table className="w-full min-w-max border-collapse text-table">{children}</table>
    </div>
  );
}

export function DataTableHead({
  children,
  grup,
}: {
  children: ReactNode;
  /**
   * Baris header di atas judul kolom, untuk mengelompokkan beberapa kolom di
   * bawah satu nama — isinya `<Th colSpan={n}>`.
   *
   * Opsional supaya seluruh tabel yang sudah ada tidak berubah sama sekali.
   */
  grup?: ReactNode;
}) {
  return (
    <thead className="sticky top-0 z-10 bg-surface-muted">
      {grup && <tr className="border-b border-line/60">{grup}</tr>}
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <th
      scope={colSpan && colSpan > 1 ? 'colgroup' : 'col'}
      colSpan={colSpan}
      className={cn(
        'whitespace-nowrap px-3 py-2 text-caption font-semibold uppercase tracking-wide text-ink-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line bg-surface">{children}</tbody>;
}

export function Td({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-3 py-2 align-middle text-ink',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Baris pengganti saat penyaringan tidak menghasilkan data. */
export function DataTableKosong({ kolom, pesan }: { kolom: number; pesan: string }) {
  return (
    <tr>
      <td colSpan={kolom} className="px-3 py-10 text-center text-body-lg text-ink-soft">
        {pesan}
      </td>
    </tr>
  );
}
