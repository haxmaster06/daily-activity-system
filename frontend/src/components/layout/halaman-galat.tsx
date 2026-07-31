import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface HalamanGalatProps {
  judul: string;
  /** Apa yang terjadi menurut sudut pandang pengguna, bukan mekanismenya. */
  pesan: string;
  /**
   * Kode rujukan untuk dilaporkan ke pengelola. Detail teknisnya hanya ada di
   * log server — pengguna cukup menyebutkan kode ini (CLAUDE.md, Aturan Bahasa).
   */
  kode?: string;
  aksi?: ReactNode;
}

/**
 * Tampilan seragam untuk seluruh keadaan galat.
 *
 * Dipakai batas galat (`error.tsx`) maupun halaman tidak ditemukan, supaya
 * pengguna melihat bentuk yang sama di mana pun kegagalannya terjadi.
 */
export function HalamanGalat({ judul, pesan, kode, aksi }: HalamanGalatProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-danger-subtle text-danger-text">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </span>

      <h1 className="text-page-title text-ink">{judul}</h1>
      <p className="mt-1.5 text-body-lg text-ink-muted">{pesan}</p>

      {kode && (
        <p className="mt-3 text-caption text-ink-soft">
          Kode rujukan: <span className="font-mono text-ink-muted">{kode}</span>
        </p>
      )}

      {aksi && <div className="mt-5 flex flex-wrap justify-center gap-2">{aksi}</div>}
    </div>
  );
}
