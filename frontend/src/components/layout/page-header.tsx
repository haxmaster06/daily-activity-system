import type { ReactNode } from 'react';

interface PageHeaderProps {
  judul: string;
  /** Dipakai hanya bila tanpa penjelasan ini fungsi halaman tidak jelas (standar §8). */
  keterangan?: string;
  /** Aksi utama halaman, ditempatkan di kanan judul. */
  aksi?: ReactNode;
}

/** Judul halaman + aksi utama, sesuai pola tata letak standar §13. */
export function PageHeader({ judul, keterangan, aksi }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-page-title text-ink">{judul}</h1>
        {keterangan && <p className="mt-0.5 text-body text-ink-muted">{keterangan}</p>}
      </div>
      {aksi && <div className="flex shrink-0 items-center gap-2">{aksi}</div>}
    </div>
  );
}
