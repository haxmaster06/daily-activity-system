'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

import { halamanMasuk } from '@/lib/gerak';

/**
 * Transisi antar halaman (standar interaksi §4.2).
 *
 * `mode="wait"` menahan halaman baru sampai halaman lama selesai keluar,
 * sehingga tidak ada dua halaman yang saling menimpa.
 *
 * Animasi tidak menahan input: halaman baru sudah interaktif sejak frame
 * pertama, hanya posisinya yang masih bergerak.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={halamanMasuk}
        initial="awal"
        animate="tampil"
        exit="keluar"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
