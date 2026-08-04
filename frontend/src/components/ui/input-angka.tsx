'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
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
  /** Ditampilkan di dalam kotak, mis. "Rp". Bukan bagian dari nilainya. */
  awalan?: string;
  /** Ditampilkan di dalam kotak, mis. "%". Bukan bagian dari nilainya. */
  akhiran?: string;
  /** Menambahkan tombol naik-turun di sisi kanan. */
  stepper?: boolean;
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
  awalan,
  akhiran,
  stepper = false,
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

  /** Menambah atau mengurangi satu satuan, dipakai tombol naik-turun. */
  function geser(arah: 1 | -1) {
    const dasar = parseAngka(draf ?? nilai) ?? 0;
    const langkah = bulat ? 1 : 1 / 10 ** desimal;
    // Dibulatkan ulang supaya penjumlahan pecahan biner tidak meninggalkan
    // ekor seperti 0.30000000000000004.
    const baru = Math.round((dasar + arah * langkah) * 10 ** desimal) / 10 ** desimal;

    setDraf(null);
    nilaiTerakhir.current = baru;
    onUbah(baru);
  }

  const isian = (
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
        (awalan || akhiran || stepper) && 'border-0 bg-transparent px-1 focus:ring-0',
        bermasalah && 'border-danger',
        className,
      )}
    />
  );

  if (!awalan && !akhiran && !stepper) {
    return isian;
  }

  /*
   * Awalan dan akhiran hanya tampilan; nilai yang tersimpan tetap angka murni.
   * Menjadikannya bagian dari isian akan membuat "Rp" ikut terurai dan
   * mengubah angkanya.
   */
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-input border border-line bg-surface px-1.5',
        ukuran === 'sm' ? 'h-input-sm' : 'h-input',
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
        bermasalah && 'border-danger',
      )}
    >
      {awalan && (
        <span aria-hidden="true" className="shrink-0 text-caption text-ink-soft">
          {awalan}
        </span>
      )}

      <span className="min-w-0 flex-1">{isian}</span>

      {akhiran && (
        <span aria-hidden="true" className="shrink-0 text-caption text-ink-soft">
          {akhiran}
        </span>
      )}

      {stepper && !terkunci && (
        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => geser(1)}
            aria-label={`Naikkan ${label}`}
            className="grid h-3 w-4 place-items-center text-ink-soft hover:text-ink"
          >
            <ChevronUp aria-hidden="true" className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => geser(-1)}
            aria-label={`Turunkan ${label}`}
            className="grid h-3 w-4 place-items-center text-ink-soft hover:text-ink"
          >
            <ChevronDown aria-hidden="true" className="size-3" />
          </button>
        </span>
      )}
    </div>
  );
}
