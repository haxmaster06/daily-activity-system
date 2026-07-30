'use client';

import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PEGAS } from '@/lib/gerak';

/**
 * Visualisasi langkah wizard (React Bits — Stepper), token DAMS.
 *
 * Langkah selesai dapat diklik untuk mundur; langkah di depan terkunci sampai
 * langkah sekarang sah (standar interaksi §3).
 *
 * Garis penghubung terisi bertahap mengikuti kemajuan, sehingga posisi
 * pengguna di dalam rangkaian terbaca sekilas.
 */
export function Stepper({
  langkah,
  aktif,
  onPilih,
}: {
  langkah: string[];
  aktif: number;
  /** Hanya dipanggil untuk langkah yang sudah dilewati. */
  onPilih?: (index: number) => void;
}) {
  const kurangiGerak = useReducedMotion();

  return (
    <ol className="flex items-start" aria-label="Langkah pengisian">
      {langkah.map((label, index) => {
        const selesai = index < aktif;
        const sekarang = index === aktif;
        const dapatDiklik = selesai && onPilih !== undefined;

        return (
          <Fragment key={label}>
            {/* Satu garis penghubung di antara dua langkah, tidak digandakan. */}
            {index > 0 && (
              <li aria-hidden="true" className="mt-3.5 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  initial={false}
                  animate={{ scaleX: selesai || sekarang ? 1 : 0 }}
                  transition={kurangiGerak ? { duration: 0 } : PEGAS}
                  style={{ originX: 0 }}
                  className="h-full bg-primary"
                />
              </li>
            )}

            <li className="flex w-24 shrink-0 flex-col items-center">
              <button
                type="button"
                onClick={dapatDiklik ? () => onPilih(index) : undefined}
                disabled={!dapatDiklik}
                aria-current={sekarang ? 'step' : undefined}
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-caption font-semibold',
                  'transition-colors duration-standar ease-keluar',
                  selesai && 'border-secondary bg-secondary text-white',
                  sekarang && 'border-primary bg-primary text-white',
                  !selesai && !sekarang && 'border-line bg-surface text-ink-soft',
                  dapatDiklik && 'cursor-pointer hover:brightness-95',
                )}
              >
                {selesai ? <Check aria-hidden="true" className="size-4" /> : <span>{index + 1}</span>}
              </button>

              <span
                className={cn(
                  'mt-1.5 text-center text-caption leading-tight',
                  sekarang ? 'font-semibold text-ink' : 'text-ink-soft',
                )}
              >
                {label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
