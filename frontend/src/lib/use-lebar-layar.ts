'use client';

import { useEffect, useState } from 'react';

/**
 * Apakah lebar layar memenuhi sebuah kueri media.
 *
 * Namanya memakai awalan `use` — satu-satunya pengecualian dari penamaan
 * Indonesia di repo ini. Aturan `react-hooks/rules-of-hooks` mengenali hook
 * dari namanya, dan nama lain membuat React berhenti memeriksa urutan
 * pemanggilan hook di dalamnya. Itu pemeriksaan keselamatan, bukan gaya.
 *
 * Render pertama selalu mengembalikan `false`, lalu dikoreksi setelah komponen
 * terpasang. Itu disengaja: render server tidak tahu lebar layar, dan menebak
 * akan membuat markup server berbeda dari markup klien — React membuang seluruh
 * hasil render dan memperingatkan ketidakcocokan hidrasi.
 *
 * Konsekuensinya pemakai hook ini harus memilih `false` sebagai keadaan yang
 * aman ditampilkan sekejap. Untuk pemilihan bentuk pengisian, itu berarti grid
 * tampil lebih dulu lalu berganti — bukan sebaliknya.
 */
export function useLebarLayar(kueri: string): boolean {
  const [cocok, setCocok] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(kueri);

    setCocok(media.matches);

    const dengar = (peristiwa: MediaQueryListEvent) => setCocok(peristiwa.matches);
    media.addEventListener('change', dengar);

    return () => media.removeEventListener('change', dengar);
  }, [kueri]);

  return cocok;
}

/** Ambang `md` Tailwind — di bawah ini tabel padat tidak lagi terbaca. */
export const LAYAR_SEMPIT = '(max-width: 767px)';
