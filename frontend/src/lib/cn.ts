import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Skala huruf project ini, sama persis dengan `tailwind.config.ts`.
 *
 * ⚠️ **Wajib didaftarkan, dan inilah sebabnya.**
 *
 * `tailwind-merge` menebak arti sebuah kelas dari namanya. Ia mengenal
 * `text-sm` dan `text-lg` sebagai ukuran huruf, tetapi tidak mengenal
 * `text-body` — dan yang tidak dikenalnya sebagai ukuran diperlakukan sebagai
 * **warna**.
 *
 * Akibatnya nyata dan sunyi: `cn('text-white', 'text-body')` menghasilkan
 * `text-body` saja. `text-white` dibuang karena dianggap bentrok warna, dan
 * yang terlihat adalah tombol biru bertuliskan hitam — tanpa satu pun
 * peringatan di konsol maupun saat build.
 *
 * Cacat itu benar-benar terjadi pada tombol "Tambah Tugas" di papan progres.
 *
 * Skala di bawah harus ikut diperbarui setiap `fontSize` pada
 * `tailwind.config.ts` berubah; `cn.test.ts` menjaga keduanya tetap sama.
 */
export const SKALA_HURUF = [
  'meta',
  'caption',
  'body',
  'body-lg',
  'label',
  'table',
  'section-title',
  'page-title',
] as const;

const gabung = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...SKALA_HURUF] }],
    },
  },
});

/** Menggabungkan className bersyarat dan menyelesaikan bentrokan utility Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return gabung(clsx(inputs));
}
