import type { Transition, Variants } from 'motion/react';

/**
 * Nilai gerak bersama (docs/standar-interaksi.md §4).
 *
 * Seluruh animasi memakai nilai dari berkas ini, bukan angka yang ditulis
 * ulang di tiap komponen.
 *
 * Takarannya sengaja ditahan: gerakan menjelaskan perubahan, bukan menghias.
 * Jarak geser kecil (8–16px) supaya antarmuka padat tidak terasa goyah, dan
 * damping tinggi supaya tidak ada pantulan.
 */

export const DURASI = {
  cepat: 0.14,
  standar: 0.26,
  kompleks: 0.38,
} as const;

/** Cepat di awal, mendarat halus. */
export const EASE_KELUAR = [0.16, 1, 0.3, 1] as const;

export const PEGAS: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 0.8,
};

export const TRANSISI_STANDAR: Transition = {
  duration: DURASI.standar,
  ease: EASE_KELUAR,
};

/** Halaman masuk: naik 8px sambil memudar masuk. */
export const halamanMasuk: Variants = {
  awal: { opacity: 0, y: 8 },
  tampil: { opacity: 1, y: 0, transition: PEGAS },
  keluar: { opacity: 0, transition: { duration: DURASI.cepat } },
};

/**
 * Isi tab dan langkah wizard: geser searah perpindahan.
 * `arah` bernilai 1 untuk maju dan -1 untuk mundur.
 */
export const geserArah: Variants = {
  awal: (arah: number) => ({ opacity: 0, x: arah > 0 ? 16 : -16 }),
  tampil: { opacity: 1, x: 0, transition: PEGAS },
  keluar: { opacity: 0, transition: { duration: DURASI.cepat } },
};

/** Wadah daftar: anak-anaknya muncul bertahap. */
export const daftarBertahap: Variants = {
  tampil: {
    transition: { staggerChildren: 0.02, delayChildren: 0.02 },
  },
};

/** Satu baris atau kartu di dalam daftar bertahap. */
export const itemDaftar: Variants = {
  awal: { opacity: 0, y: 6 },
  tampil: { opacity: 1, y: 0, transition: { duration: DURASI.standar, ease: EASE_KELUAR } },
};

/** Umpan balik tekan pada elemen interaktif. */
export const saatDitekan = { scale: 0.98 };
