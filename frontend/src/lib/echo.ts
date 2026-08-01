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

function bacaEnv(nama: string, bawaan: string): string {
  const nilai = process.env[nama];

  return nilai === undefined || nilai === '' ? bawaan : nilai;
}

export function echoDams(): Echo<'reverb'> | null {
  // Hanya di peramban. Di server tidak ada WebSocket, dan memanggilnya dari
  // Server Component akan melempar.
  if (typeof window === 'undefined') {
    return null;
  }

  if (sambungan !== null) {
    return sambungan;
  }

  const kunci = bacaEnv('NEXT_PUBLIC_REVERB_KEY', 'dams-lokal');
  const host = bacaEnv('NEXT_PUBLIC_REVERB_HOST', '127.0.0.1');
  const port = Number(bacaEnv('NEXT_PUBLIC_REVERB_PORT', '13003'));
  const aman = bacaEnv('NEXT_PUBLIC_REVERB_SCHEME', 'http') === 'https';

  sambungan = new Echo({
    broadcaster: 'reverb',
    Pusher,
    key: kunci,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: aman,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth',
  });

  return sambungan;
}
