'use client';

import { useEffect, useRef, useState } from 'react';

import { formatAngka, parseAngka } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Props {
  id?: string;
  nilai: number | null;
  onUbah: (nilai: number | null) => void;
  /** Angka di belakang koma saat ditampilkan. 0 untuk bilangan bulat. */
  desimal?: number;
  bulat?: boolean;
  placeholder?: string;
  label: string;
  bermasalah?: boolean;
  terkunci?: boolean;
  ukuran?: 'sm' | 'md';
  className?: string;
}

/**
 * Isian angka yang benar-benar dapat diketik.
 *
 * Pendahulunya memakai `<input type="number">` terkendali yang menjalankan
 * `Number()` pada tiap ketikan. Akibatnya pemisah desimal tidak pernah bisa
 * masuk: begitu pengguna mengetik `12,`, nilainya runtuh menjadi `12` lalu
 * dirender ulang sebagai `"12"` — komanya hilang sebelum angka berikutnya
 * sempat diketik. Mengisi 12,75 praktis mustahil.
 *
 * Dua hal yang memperbaikinya:
 *
 * 1. **`type="text"`, bukan `type="number"`.** Peramban menolak koma pada
 *    isian angka dan mengembalikan `value` kosong untuk masukan yang belum
 *    selesai, sehingga tidak ada cara mengetahui apa yang sedang diketik.
 * 2. **Draf teks selama isian difokus.** Selama pengguna mengetik, komponen
 *    memegang teksnya apa adanya dan tidak menghitung ulang apa pun. Angkanya
 *    baru diurai ketika isian ditinggalkan.
 *
 * Saat ditinggalkan, hasilnya ditulis kembali dalam bentuk terformat
 * (`12,75`). Itu bukan hiasan, melainkan pengaman: pengguna langsung melihat
 * angka mana yang dipahami sistem, sehingga salah tafsir seperti `1.234`
 * ketahuan saat itu juga — bukan pada rekapan bulan depan.
 */
export function InputAngka({
  id,
  nilai,
  onUbah,
  desimal = 0,
  bulat = false,
  placeholder,
  label,
  bermasalah = false,
  terkunci = false,
  ukuran = 'sm',
  className,
}: Props) {
  const [draf, setDraf] = useState<string | null>(null);
  const nilaiTerakhir = useRef(nilai);

  /*
   * Perubahan yang datang dari luar selagi isian difokus — kolom hitungan yang
   * ikut bergerak, atau pemulihan draf — tetap harus terlihat. Yang tidak boleh
   * adalah menimpa ketikan pengguna dengan nilai yang justru berasal dari
   * ketikan itu sendiri.
   */
  useEffect(() => {
    if (nilai !== nilaiTerakhir.current) {
      nilaiTerakhir.current = nilai;
      setDraf(null);
    }
  }, [nilai]);

  const tampilan =
    draf ?? (nilai === null || nilai === undefined ? '' : formatAngka(nilai, desimal));

  function selesai() {
    if (draf === null) return;

    const angka = parseAngka(draf);
    const dibulatkan = angka !== null && bulat ? Math.round(angka) : angka;

    setDraf(null);
    nilaiTerakhir.current = dibulatkan;

    if (dibulatkan !== nilai) {
      onUbah(dibulatkan);
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      // Papan ketik ponsel memakai `inputMode`; `pattern` menahan isian yang
      // jelas bukan angka pada peramban yang memvalidasi sendiri.
      pattern="[0-9.,\-]*"
      value={tampilan}
      onChange={(e) => setDraf(e.target.value)}
      onBlur={selesai}
      onKeyDown={(e) => {
        if (e.key === 'Enter') selesai();
      }}
      readOnly={terkunci}
      placeholder={placeholder}
      aria-label={label}
      aria-invalid={bermasalah || undefined}
      className={cn(
        ukuran === 'sm' ? 'field field-sm' : 'field',
        'text-right tabular-nums',
        bermasalah && 'border-danger',
        className,
      )}
    />
  );
}
