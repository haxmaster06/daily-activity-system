'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { daftarBertahap, itemDaftar } from '@/lib/gerak';

/**
 * Daftar yang anggotanya muncul bertahap.
 *
 * Diadaptasi dari pola Animated List milik React Bits, ditahan takarannya
 * sesuai standar interaksi §4.2: jeda 20ms antar item dan hanya delapan item
 * pertama yang beranimasi. Sisanya langsung tampil — menunggu animasi puluhan
 * baris justru memperlambat pembacaan.
 */
export function DaftarMuncul({
  children,
  className,
  batas = 8,
}: {
  children: ReactNode[];
  className?: string;
  batas?: number;
}) {
  const kurangiGerak = useReducedMotion();

  if (kurangiGerak) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={daftarBertahap}
      initial="awal"
      animate="tampil"
    >
      {children.map((anak, index) =>
        index < batas ? (
          <motion.div key={index} variants={itemDaftar}>
            {anak}
          </motion.div>
        ) : (
          <div key={index}>{anak}</div>
        ),
      )}
    </motion.div>
  );
}
