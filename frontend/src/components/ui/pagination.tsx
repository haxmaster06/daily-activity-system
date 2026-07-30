'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';

export interface MetaHalaman {
  halaman_saat_ini: number;
  per_halaman: number;
  total_data: number;
  total_halaman: number;
}

/**
 * Bar pagination server-side (standar §21.3).
 *
 * Nomor halaman disimpan di URL agar tautan halaman dapat dibagikan dan
 * tombol kembali peramban bekerja seperti yang diharapkan.
 */
export function Pagination({ meta, satuan }: { meta: MetaHalaman; satuan: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { halaman_saat_ini: halaman, per_halaman: perHalaman, total_data: total } = meta;

  if (total === 0) {
    return null;
  }

  const dari = (halaman - 1) * perHalaman + 1;
  const sampai = Math.min(halaman * perHalaman, total);

  function keHalaman(nomor: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nomor <= 1) {
      params.delete('halaman');
    } else {
      params.set('halaman', String(nomor));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
      <p className="text-caption text-ink-muted">
        Menampilkan {formatAngka(dari)}–{formatAngka(sampai)} dari {formatAngka(total)} {satuan}
      </p>

      {meta.total_halaman > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => keHalaman(halaman - 1)}
            disabled={halaman <= 1}
            aria-label="Halaman sebelumnya"
            className="grid size-7 place-items-center rounded-control border border-line text-ink-muted transition-colors duration-fast hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>

          {nomorHalaman(halaman, meta.total_halaman).map((nomor, index) =>
            nomor === null ? (
              <span key={`jeda-${index}`} className="px-1 text-caption text-ink-soft">
                …
              </span>
            ) : (
              <button
                key={nomor}
                type="button"
                onClick={() => keHalaman(nomor)}
                aria-current={nomor === halaman ? 'page' : undefined}
                className={cn(
                  'h-7 min-w-7 rounded-control px-2 text-caption transition-colors duration-fast',
                  nomor === halaman
                    ? 'bg-primary font-semibold text-white'
                    : 'border border-line text-ink-muted hover:bg-surface-muted',
                )}
              >
                {nomor}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => keHalaman(halaman + 1)}
            disabled={halaman >= meta.total_halaman}
            aria-label="Halaman berikutnya"
            className="grid size-7 place-items-center rounded-control border border-line text-ink-muted transition-colors duration-fast hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Deret nomor halaman ringkas: 1 … 4 5 6 … 20 */
function nomorHalaman(saatIni: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const hasil: (number | null)[] = [1];
  const mulai = Math.max(2, saatIni - 1);
  const akhir = Math.min(total - 1, saatIni + 1);

  if (mulai > 2) hasil.push(null);
  for (let n = mulai; n <= akhir; n++) hasil.push(n);
  if (akhir < total - 1) hasil.push(null);

  hasil.push(total);

  return hasil;
}
