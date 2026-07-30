'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

import { cn } from '@/lib/cn';

/*
 * Memakai HTMLMotionProps, bukan ButtonHTMLAttributes: keduanya sama-sama
 * mendefinisikan `onDrag` dengan bentuk berbeda, dan menggabungkannya membuat
 * tipe tidak dapat diselesaikan.
 */
interface SpectacularButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  /** Menampilkan teks proses dan mengunci tombol. */
  memproses?: boolean;
  labelMemproses?: string;
  penuh?: boolean;
}

/**
 * Tombol aksi utama (React Bits — Spectacular Button), disesuaikan token DAMS.
 *
 * Efeknya berupa sapuan cahaya tipis yang melintas saat kursor berada di atas
 * tombol. Sapuan itu tidak berjalan sendiri — hanya muncul sebagai umpan balik
 * atas niat pengguna, sesuai standar interaksi §4.3.
 *
 * Satu layar paling banyak punya satu tombol seperti ini: Masuk, Kirim, atau
 * Simpan. Tombol sekunder dan aksi pada tabel memakai `Button` biasa.
 */
export function SpectacularButton({
  children,
  memproses = false,
  labelMemproses = 'Memproses...',
  penuh = false,
  className,
  disabled,
  ...props
}: SpectacularButtonProps) {
  const kurangiGerak = useReducedMotion();

  return (
    <motion.button
      whileTap={kurangiGerak ? undefined : { scale: 0.98 }}
      disabled={disabled || memproses}
      className={cn(
        'group relative isolate inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden',
        'rounded-control bg-primary px-4 font-medium text-body-lg text-white',
        'shadow-card transition-colors duration-fast ease-keluar hover:bg-primary-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-60',
        penuh && 'w-full',
        className,
      )}
      {...props}
    >
      {/*
        Sapuan cahaya. `translate-x` digerakkan lewat kelas `group-hover`
        supaya animasinya ditangani CSS — tidak ada state React yang berubah,
        sehingga tombol tetap responsif selama sapuan berjalan.
      */}
      {!kurangiGerak && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12',
            'bg-white/20 blur-sm transition-transform duration-[600ms] ease-keluar',
            'group-hover:translate-x-[300%]',
          )}
        />
      )}

      <span className="relative flex items-center gap-1.5">
        {memproses ? labelMemproses : children}
      </span>
    </motion.button>
  );
}
