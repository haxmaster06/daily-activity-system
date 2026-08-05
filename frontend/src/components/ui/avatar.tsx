'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

const UKURAN = {
  sm: 'size-7 text-meta',
  md: 'size-9 text-caption',
  lg: 'size-16 text-body-lg',
  xl: 'size-24 text-page-title',
} as const;

/**
 * Inisial nama, paling banyak dua huruf.
 *
 * Diambil dari kata pertama dan terakhir, bukan dua kata pertama: "Muhammad
 * Rizky Pratama" menjadi MP, bukan MR — nama depan pada banyak nama Indonesia
 * dipakai bersama-sama, dan dua huruf pertamanya membuat separuh daftar
 * terlihat sama.
 */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);

  if (kata.length === 0) return '?';
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();

  return (kata[0][0] + kata[kata.length - 1][0]).toUpperCase();
}

/**
 * Warna latar inisial, dipilih dari namanya sendiri.
 *
 * Tetap sama setiap kali orang yang sama tampil, sehingga wajah-wajah tanpa foto
 * masih dapat dibedakan sekilas pada daftar panjang. Palet dikunci pada token
 * yang sudah ada — bukan warna acak — supaya kontrasnya tetap terjaga.
 */
const PALET = [
  'bg-primary-subtle text-primary-text',
  'bg-secondary-subtle text-secondary-text',
  'bg-accent-subtle text-accent-text',
  'bg-surface-sunken text-ink-muted',
] as const;

function warna(nama: string): string {
  let jumlah = 0;

  for (const huruf of nama) {
    jumlah = (jumlah + huruf.charCodeAt(0)) % 997;
  }

  return PALET[jumlah % PALET.length];
}

/**
 * Foto seseorang, atau inisial namanya bila belum ada foto.
 *
 * Inisial dipakai sebagai pengganti, bukan siluet orang generik: siluet yang
 * sama pada seluruh daftar tidak membedakan siapa pun, sedangkan inisial
 * berwarna tetap dapat dibaca sekilas.
 *
 * Memakai `<img>` biasa, bukan `next/image`. Alamatnya menunjuk route yang
 * meneruskan permintaan beserta token sesi; pengoptimal gambar Next.js akan
 * mengambilnya dari server tanpa cookie tersebut, dan yang tersimpan di
 * temboloknya justru jawaban 401.
 */
export function Avatar({
  nama,
  foto,
  ukuran = 'md',
  className,
}: {
  nama: string;
  foto?: string | null;
  ukuran?: keyof typeof UKURAN;
  className?: string;
}) {
  const [gagal, setGagal] = useState(false);
  const tampilkanFoto = typeof foto === 'string' && foto !== '' && !gagal;

  return (
    /*
     * ⚠️ Wadahnya `block`, bukan `grid`.
     *
     * Bentuk sebelumnya memakai `grid place-items-center` untuk menengahkan
     * inisial. `justify-items: center` membuat isi kisinya berukuran
     * fit-content, sehingga gambar di dalamnya berakhir **lebih sempit**
     * daripada wadahnya — 18px di dalam lingkaran 28px — dan wajah orangnya
     * terpotong di kiri dan kanan.
     *
     * Kini penengahan inisial dikerjakan lapisan tersendiri, dan gambarnya
     * mengisi wadah lewat posisi mutlak. Keduanya tidak lagi saling menentukan
     * ukuran.
     */
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full font-semibold',
        UKURAN[ukuran],
        tampilkanFoto ? 'bg-surface-muted' : warna(nama),
        className,
      )}
    >
      {tampilkanFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- lihat catatan di atas
        <img
          src={foto}
          /*
           * Alt sengaja kosong. Nama orangnya selalu tertulis di sebelah avatar
           * ini; mengulanginya membuat pembaca layar menyebut nama yang sama dua
           * kali berturut-turut.
           */
          alt=""
          className="absolute inset-0 block h-full w-full object-cover"
          onError={() => setGagal(true)}
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
          {inisial(nama)}
        </span>
      )}
    </span>
  );
}
