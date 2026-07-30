'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

import { formatAngka } from '@/lib/format';

/**
 * Angka yang menghitung naik ke nilainya saat pertama terlihat.
 *
 * Diadaptasi dari pola Count Up milik React Bits, disesuaikan dengan token
 * DAMS: durasi mengikuti standar interaksi §4.1 dan angkanya diformat lewat
 * `formatAngka` sehingga pemisah ribuan tetap gaya Indonesia (standarisasi §26).
 *
 * Dipakai sebatas kartu statistik. Angka di dalam tabel tidak beranimasi —
 * gerakan di sana justru mengganggu pembacaan data.
 */
export function AngkaHidup({
  nilai,
  durasi = 0.9,
  className,
}: {
  nilai: number;
  durasi?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const terlihat = useInView(ref, { once: true, margin: '-10% 0px' });
  const kurangiGerak = useReducedMotion();

  useEffect(() => {
    const elemen = ref.current;
    if (!elemen) return;

    // Menghormati prefers-reduced-motion: nilai langsung ditampilkan.
    if (kurangiGerak || !terlihat) {
      elemen.textContent = formatAngka(kurangiGerak ? nilai : 0);
      return;
    }

    const kontrol = animate(0, nilai, {
      duration: durasi,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (angka) => {
        elemen.textContent = formatAngka(Math.round(angka));
      },
    });

    return () => kontrol.stop();
  }, [nilai, durasi, terlihat, kurangiGerak]);

  return (
    <span ref={ref} className={className}>
      {/* Nilai akhir dirender di server agar tetap terbaca tanpa JavaScript. */}
      {formatAngka(nilai)}
    </span>
  );
}
