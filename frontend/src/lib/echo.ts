'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/**
 * Sambungan WebSocket ke Reverb.
 *
 * Dibuat sekali lalu dipakai bersama: tiap instance Echo membuka sambungan
 * sendiri, dan komponen yang dipasang ulang saat berpindah halaman akan
 * meninggalkan sambungan menganggur bila tidak dibagi.
 *
 * Otorisasi channel privat lewat `/api/broadcasting/auth` di Next, bukan
 * langsung ke backend — token berada di cookie httpOnly yang tidak dapat
 * dibaca peramban (lihat route handler-nya).
 */
let sambungan: Echo<'reverb'> | null = null;

/*
 * Nilai NEXT_PUBLIC_* WAJIB ditulis sebagai `process.env.NAMA_PENUH`.
 *
 * Next.js menanamkannya saat build dengan mengganti teks ekspresi itu satu per
 * satu — bukan dengan menyediakan objek `process.env` di peramban. Membacanya
 * lewat pembungkus, `process.env[nama]`, membuat webpack tidak punya apa pun
 * untuk diganti: tidak ada yang tertanam, `process.env` di peramban kosong, dan
 * seluruh nilai diam-diam jatuh ke bawaan di bawah ini.
 *
 * Kegagalannya tidak terlihat di mesin pengembang justru karena bawaan itu
 * kebetulan alamat pengembangan lokal. Di server, peramban akan menyambung ke
 * 127.0.0.1 miliknya sendiri, dan lonceng notifikasi diam selamanya tanpa satu
 * pun pesan galat.
 */
const KUNCI = process.env.NEXT_PUBLIC_REVERB_KEY || 'dams-lokal';
const HOST = process.env.NEXT_PUBLIC_REVERB_HOST || '127.0.0.1';
const PORT = process.env.NEXT_PUBLIC_REVERB_PORT || '13003';
const SKEMA = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http';

export function echoDams(): Echo<'reverb'> | null {
  // Hanya di peramban. Di server tidak ada WebSocket, dan memanggilnya dari
  // Server Component akan melempar.
  if (typeof window === 'undefined') {
    return null;
  }

  if (sambungan !== null) {
    return sambungan;
  }

  const port = Number(PORT);
  const aman = SKEMA === 'https';

  sambungan = new Echo({
    broadcaster: 'reverb',
    Pusher,
    key: KUNCI,
    wsHost: HOST,
    wsPort: port,
    wssPort: port,
    forceTLS: aman,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
  });

  return sambungan;
}
