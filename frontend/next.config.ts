import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * Direktori keluaran dapat dipindah lewat environment.
   *
   * `next dev` dan `next build` sama-sama menulis ke direktori ini. Menjalankan
   * build produksi selagi dev server hidup membuat keduanya berebut berkas yang
   * sama, dan dev server mati dengan `EPERM: .next\trace`. Setel
   * `NEXT_DIST_DIR=.next-prod` untuk menguji build produksi tanpa mengganggu
   * dev server yang sedang berjalan.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Dibutuhkan image Docker yang ramping (lihat docker/frontend.Dockerfile)
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
