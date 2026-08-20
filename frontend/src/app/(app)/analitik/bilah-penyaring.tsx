'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Menyembunyikan bar penyaring bersama pada halaman yang memang tak memakainya.
 *
 * Proses Produksi sengaja tanpa penyaring bertumpuk — satu-satunya kontrolnya
 * adalah periode, di dalam papannya sendiri. Menampilkan bar penyaring di sana
 * justru mengembalikan "parameter terlalu banyak" yang ingin dihilangkan.
 */
export function BilahPenyaring({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/analitik/produksi') return null;

  return <>{children}</>;
}
