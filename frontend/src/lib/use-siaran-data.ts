'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { echoDams } from '@/lib/echo';

/**
 * Jeda penggabungan siaran, dalam milidetik.
 *
 * Satu import berkas menyimpan ratusan baris dan menyiarkan tiap satunya. Tanpa
 * penggabungan, halaman Analytics akan memuat ulang ratusan kali berturut-turut
 * — dan tiap muat ulang menghitung seluruh angkanya dari awal.
 */
const JEDA_GABUNG = 1_500;

/**
 * Menyegarkan halaman Analytics saat data departemennya berubah.
 *
 * ## Yang disegarkan adalah halamannya, bukan sepotong angka
 *
 * `router.refresh()` menjalankan ulang Server Component halaman ini, yang
 * mengambil angkanya lewat jalur biasa — lengkap dengan `scopeVisibleTo()` dan
 * seluruh penyaring yang sedang berlaku. Menyisipkan angka dari muatan siaran
 * akan lebih cepat, dan salah: angka Analytics bergantung pada jangkauan data
 * tiap penonton, sehingga satu muatan yang sama tidak dapat benar bagi Direktur
 * korporat dan supervisor satu departemen sekaligus.
 *
 * ## Berlangganan pada departemen yang sedang dilihat
 *
 * Bukan pada satu channel bersama. Otorisasinya per departemen di
 * `routes/channels.php`, dan langganan yang ditolak tidak pernah menerima apa
 * pun — sehingga daftar departemen di sini menentukan apa yang didengar, bukan
 * apa yang boleh didengar.
 */
export function useSiaranData(departemenId: number[], onSegar?: () => void) {
  const router = useRouter();
  const pewaktuRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Callback ditahan di ref supaya fungsi baru pada tiap render tidak melepas
   * dan memasang ulang seluruh langganan WebSocket.
   */
  const onSegarRef = useRef(onSegar);
  onSegarRef.current = onSegar;

  /*
   * Daftar id disandikan menjadi teks untuk dipakai sebagai dependensi. Array
   * baru pada tiap render — dan itu yang terjadi, sebab isinya diturunkan dari
   * data halaman — akan melepas lalu memasang ulang seluruh langganan pada
   * setiap render.
   */
  const kunci = departemenId.join(',');

  useEffect(() => {
    const echo = echoDams();

    if (echo === null) return;

    const daftar = kunci.split(',').filter(Boolean);

    if (daftar.length === 0) return;

    const segarkan = () => {
      if (pewaktuRef.current !== null) clearTimeout(pewaktuRef.current);

      pewaktuRef.current = setTimeout(() => {
        pewaktuRef.current = null;
        router.refresh();
        onSegarRef.current?.();
      }, JEDA_GABUNG);
    };

    for (const id of daftar) {
      echo.private(`departemen.${id}`).listen('.data.berubah', segarkan);
    }

    return () => {
      if (pewaktuRef.current !== null) clearTimeout(pewaktuRef.current);

      for (const id of daftar) {
        echo.leave(`departemen.${id}`);
      }
    };
  }, [kunci, router]);
}
