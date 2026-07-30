'use client';

import { useRef, type ReactNode } from 'react';
import { useMotionValue, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/cn';

/**
 * Kartu dengan tepi menyala mengikuti kursor (React Bits — Border Glow),
 * disesuaikan token DAMS.
 *
 * Cahaya hanya muncul saat kursor berada di atas kartu, dan hanya dipakai
 * pada kartu yang memang dapat diklik. Kartu biasa tidak menyala — cahaya
 * yang menyala terus-menerus melanggar standar interaksi §4.3.
 *
 * Posisi kursor ditulis ke CSS custom property lewat MotionValue, bukan ke
 * state React, sehingga menggerakkan kursor tidak memicu render ulang.
 */
export function BorderGlowCard({
  children,
  className,
  asChild = false,
}: {
  children: ReactNode;
  className?: string;
  /** Merender tanpa pembungkus tambahan bila anak sudah berupa elemen blok. */
  asChild?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const kurangiGerak = useReducedMotion();
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);

  function ikutiKursor(event: React.MouseEvent<HTMLDivElement>) {
    if (kurangiGerak) return;

    const kotak = ref.current?.getBoundingClientRect();
    if (!kotak) return;

    x.set(event.clientX - kotak.left);
    y.set(event.clientY - kotak.top);

    ref.current?.style.setProperty('--glow-x', `${event.clientX - kotak.left}px`);
    ref.current?.style.setProperty('--glow-y', `${event.clientY - kotak.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={ikutiKursor}
      className={cn(
        'group relative isolate overflow-hidden rounded-card border border-line bg-surface shadow-card',
        'transition-[border-color,box-shadow] duration-standar ease-keluar',
        'hover:border-primary/40',
        className,
      )}
    >
      {!kurangiGerak && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-standar',
            'group-hover:opacity-100',
          )}
          style={{
            background:
              'radial-gradient(220px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(26, 115, 232, 0.10), transparent 70%)',
          }}
        />
      )}

      {asChild ? children : <div className="relative">{children}</div>}
    </div>
  );
}
