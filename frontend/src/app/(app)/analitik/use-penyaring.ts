'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Penyaringan Analytics yang dipakai bersama seluruh halaman dan widgetnya.
 *
 * Dipusatkan di sini karena penyaringan kini dapat diubah dari **banyak
 * tempat** — bilah penyaring, batang grafik, baris tabel, judul kartu. Bila tiap
 * tempat menyusun URL-nya sendiri, cepat atau lambat salah satunya akan
 * menghapus penyaring lain yang sedang aktif, atau menulis kunci yang berbeda
 * untuk hal yang sama.
 *
 * Nilainya hidup di URL, bukan di state: penyaringan dapat dibagikan lewat
 * tautan, bertahan saat halaman dimuat ulang, dan ikut terbawa antar tab.
 */
export function usePenyaring() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const departemen = useMemo(
    () =>
      (searchParams.get('departemen') ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number),
    [searchParams],
  );

  const terapkan = useCallback(
    (ubah: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      ubah(params);

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const aturDepartemen = useCallback(
    (id: number[]) => {
      terapkan((params) => {
        if (id.length === 0) params.delete('departemen');
        else params.set('departemen', id.join(','));
      });
    },
    [terapkan],
  );

  /**
   * Menyaring ke satu departemen, atau melepasnya bila sudah menjadi
   * satu-satunya yang terpilih.
   *
   * Menekan hal yang sama dua kali mengembalikan keadaan semula — tanpa itu,
   * pengguna yang tidak sengaja menyaring harus mencari tombol Bersihkan untuk
   * kembali.
   */
  const saringDepartemen = useCallback(
    (id: number) => {
      const sudahSendiri = departemen.length === 1 && departemen[0] === id;

      aturDepartemen(sudahSendiri ? [] : [id]);
    },
    [aturDepartemen, departemen],
  );

  const alihkanDepartemen = useCallback(
    (id: number) => {
      aturDepartemen(
        departemen.includes(id)
          ? departemen.filter((satu) => satu !== id)
          : [...departemen, id],
      );
    },
    [aturDepartemen, departemen],
  );

  const pilihMetrik = useCallback(
    (penanda: string) => terapkan((params) => params.set('metrik', penanda)),
    [terapkan],
  );

  const bersihkan = useCallback(() => router.push(pathname), [pathname, router]);

  return {
    dari: searchParams.get('dari'),
    sampai: searchParams.get('sampai'),
    metrik: searchParams.get('metrik'),
    departemen,
    /** Apakah satu departemen sedang menjadi satu-satunya penyaring. */
    hanyaDepartemen: (id: number) => departemen.length === 1 && departemen[0] === id,
    terapkan,
    aturDepartemen,
    saringDepartemen,
    alihkanDepartemen,
    pilihMetrik,
    bersihkan,
    adaPenyaring:
      searchParams.get('dari') !== null ||
      searchParams.get('sampai') !== null ||
      departemen.length > 0,
  };
}
