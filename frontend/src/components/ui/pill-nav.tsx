'use client';

import { useId, useRef, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/cn';
import { geserArah, PEGAS } from '@/lib/gerak';

export interface ItemTab {
  /** Nilai yang ditulis ke URL. */
  nilai: string;
  label: string;
  /** Ditampilkan sebagai angka di sebelah label, mis. "Aktivitas (12)". */
  jumlah?: number;
  /** Menandai tab yang memuat kolom bermasalah (standar interaksi §2). */
  bermasalah?: boolean;
  isi: ReactNode;
}

/**
 * Tab bergaya pil (React Bits — Pill Nav), disesuaikan token DAMS.
 *
 * Penanda tab aktif berupa satu elemen yang berpindah posisi memakai
 * `layoutId`, sehingga terlihat meluncur dari tab lama ke tab baru — bukan
 * muncul-hilang. Itu satu-satunya gerakan dekoratif di sini; sisanya
 * menjelaskan arah perpindahan isi.
 *
 * Tab aktif disimpan pada URL agar tautannya dapat dibagikan dan tombol
 * kembali peramban bekerja.
 *
 * Jangan memakai tab untuk isian berurutan yang saling bergantung — itu
 * wizard.
 */
export function PillNav({ item, kunciUrl = 'tab' }: { item: ItemTab[]; kunciUrl?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const arah = useRef(1);
  const idPenanda = useId();

  const dariUrl = searchParams.get(kunciUrl);
  const aktif = item.some((t) => t.nilai === dariUrl) ? dariUrl! : item[0].nilai;
  const indexAktif = item.findIndex((t) => t.nilai === aktif);

  function pindah(nilai: string) {
    if (nilai === aktif) return;

    arah.current = item.findIndex((t) => t.nilai === nilai) > indexAktif ? 1 : -1;

    const params = new URLSearchParams(searchParams.toString());
    if (nilai === item[0].nilai) params.delete(kunciUrl);
    else params.set(kunciUrl, nilai);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bagian halaman"
        className="flex gap-1 overflow-x-auto rounded-card bg-surface-muted p-1"
      >
        {item.map((tab) => {
          const dipilih = tab.nilai === aktif;

          return (
            <button
              key={tab.nilai}
              role="tab"
              type="button"
              aria-selected={dipilih}
              onClick={() => pindah(tab.nilai)}
              className={cn(
                'relative shrink-0 rounded-control px-3 py-1.5 text-body-lg transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                dipilih ? 'text-primary-text' : 'text-ink-muted hover:text-ink',
              )}
            >
              {dipilih && (
                <motion.span
                  layoutId={idPenanda}
                  transition={PEGAS}
                  className="absolute inset-0 rounded-control bg-surface shadow-card"
                />
              )}

              <span className="relative flex items-center gap-1.5 whitespace-nowrap">
                <span className={dipilih ? 'font-semibold' : undefined}>{tab.label}</span>

                {tab.jumlah !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-meta font-semibold',
                      dipilih ? 'bg-primary-subtle text-primary-text' : 'bg-surface text-ink-soft',
                    )}
                  >
                    {tab.jumlah}
                  </span>
                )}

                {tab.bermasalah && (
                  <span
                    aria-label="Ada isian yang perlu diperbaiki"
                    className="size-1.5 rounded-full bg-danger"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden pt-3">
        <AnimatePresence mode="wait" custom={arah.current} initial={false}>
          <motion.div
            key={aktif}
            role="tabpanel"
            custom={arah.current}
            variants={geserArah}
            initial="awal"
            animate="tampil"
            exit="keluar"
          >
            {item[indexAktif]?.isi}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
