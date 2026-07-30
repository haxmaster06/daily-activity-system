import { cn } from '@/lib/cn';

/**
 * Kerangka muat (standar §19). Kerangka harus sebentuk isi yang digantikannya
 * agar tidak ada lompatan tata letak saat data tiba.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-surface-sunken', className)}
    />
  );
}

/** Kerangka tabel dengan jumlah kolom & baris disamakan dengan isi aslinya. */
export function SkeletonTabel({ kolom, baris = 6 }: { kolom: number; baris?: number }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="Memuat data">
      {Array.from({ length: baris }).map((_, indexBaris) => (
        <div key={indexBaris} className="flex items-center gap-3 px-3 py-2.5">
          {Array.from({ length: kolom }).map((_, indexKolom) => (
            <Skeleton key={indexKolom} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Kerangka kartu statistik dashboard. */
export function SkeletonKartuStatistik() {
  return (
    <div className="card p-3" role="status" aria-label="Memuat statistik">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-6 w-14" />
    </div>
  );
}
