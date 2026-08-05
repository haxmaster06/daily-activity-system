'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Tooltip } from '@/components/ui/tooltip';
import { selisihMembaik, selisihPersen, type KartuKpi } from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';

/**
 * Satu angka utama beserta pembandingnya.
 *
 * **Angka tanpa pembanding hampir tidak berarti.** "82%" baru berbicara setelah
 * diketahui periode sebelumnya 91% — dan itu pula yang membedakan halaman
 * ringkasan dari sekadar papan angka.
 *
 * Arah membaik berbeda tiap kartu: kepatuhan naik itu baik, kartu telat naik
 * itu buruk. Karena itu warnanya ditentukan `arah_baik`, bukan tanda selisihnya.
 * Penanda naik-turun selalu disertai angka dan ikon — bukan warna saja.
 */
export function KartuAngka({ kartu }: { kartu: KartuKpi }) {
  const selisih = selisihPersen(kartu);
  const membaik = selisih === null ? null : selisihMembaik(kartu, selisih);

  const Ikon = selisih === null || selisih === 0 ? Minus : selisih > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <Tooltip isi={kartu.keterangan}>
        <span className="cursor-help text-caption text-ink-muted underline decoration-dotted underline-offset-2">
          {kartu.label}
        </span>
      </Tooltip>

      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-page-title tabular-nums text-ink">
          {formatAngka(kartu.nilai)}
        </span>
        <span className="text-body text-ink-soft">{kartu.satuan}</span>
      </p>

      {selisih === null ? (
        <p className="mt-1 text-caption text-ink-soft">Tanpa pembanding</p>
      ) : (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-caption font-medium',
            membaik ? 'text-secondary-text' : 'text-danger-text',
          )}
        >
          <Ikon aria-hidden="true" className="size-3.5" />
          {selisih > 0 ? '+' : ''}
          {formatAngka(selisih)}% dari periode sebelumnya
        </p>
      )}
    </div>
  );
}
