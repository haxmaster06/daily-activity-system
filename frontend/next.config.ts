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
  /*
   * Render metadata di dalam <head>, bukan di-stream ke <body>.
   *
   * Sejak Next 15.4 metadata di-stream ke akhir <body> untuk peramban biasa,
   * lalu sebagian dipindah ke <head> oleh skrip klien. Tetapi <link
   * rel="manifest"> TIDAK ikut dipindah, dan Chrome hanya mengenali manifest
   * dari <head> — akibatnya PWA dianggap "tanpa manifest" dan tak bisa dipasang.
   *
   * `htmlLimitedBots` menandai UA yang metadatanya harus dirender blocking di
   * <head> (bukan di-stream). Dengan regex yang cocok ke semua UA, setiap
   * permintaan diperlakukan demikian — mengembalikan perilaku metadata-di-head
   * seperti sebelum 15.4. Biayanya nihil di sini karena metadatanya statis.
   */
  htmlLimitedBots: /.*/,
};

export default nextConfig;
