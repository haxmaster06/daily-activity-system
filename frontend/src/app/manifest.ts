import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — membuat DAMS dapat dipasang ke homescreen ponsel.
 *
 * Disajikan Next.js di `/manifest.webmanifest`, dan `<link rel="manifest">`
 * disuntik otomatis ke tiap halaman. Inilah yang memicu tombol "Install app"
 * di Chrome/Android dan membuat aplikasi terbuka layar penuh (`standalone`).
 *
 * Warna diambil dari brand yang sudah baku (`tailwind.config.ts`): primary
 * #1A73E8, background #F5F7FA.
 *
 * Sengaja tanpa service worker / mode offline — bukan syarat pemasangan, dan
 * pada aplikasi internal yang selalu online justru menghidupkan lagi masalah
 * halaman/bundle basi vs server.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DAMS — Sistem Monitoring Aktivitas Harian',
    short_name: 'DAMS',
    description: 'Pencatatan dan pemantauan aktivitas harian antar departemen.',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#1A73E8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
