'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/** Penyaring yang menerima banyak nilai sekaligus. */
export const KUNCI_DAFTAR = ['departemen', 'status', 'pengguna', 'template'] as const;

export type KunciDaftar = (typeof KUNCI_DAFTAR)[number];

/**
 * Penyaringan Analytics yang dipakai bersama seluruh halaman dan widgetnya.
 *
 * Dipusatkan di sini karena penyaringan dapat diubah dari **banyak tempat** —
 * bilah penyaring, batang grafik, baris tabel, judul kartu, badge status. Bila
 * tiap tempat menyusun URL-nya sendiri, cepat atau lambat salah satunya akan
 * menghapus penyaring lain yang sedang aktif, atau menulis kunci yang berbeda
 * untuk hal yang sama.
 *
 * Keempat penyaring berdaftar diperlakukan **seragam**, bukan ditulis satu per
 * satu. Menuliskannya empat kali berarti empat kesempatan agar salah satunya
 * berperilaku berbeda — misalnya lupa menghapus kuncinya saat daftarnya kosong,
 * sehingga URL menyisakan `?status=` yang terbawa selamanya.
 *
 * Nilainya hidup di URL, bukan di state: penyaringan dapat dibagikan lewat
 * tautan, bertahan saat halaman dimuat ulang, dan ikut terbawa antar tab.
 */
export function usePenyaring() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const daftar = useMemo(() => {
    const hasil = {} as Record<KunciDaftar, string[]>;

    for (const kunci of KUNCI_DAFTAR) {
      hasil[kunci] = (searchParams.get(kunci) ?? '').split(',').filter(Boolean);
    }

    return hasil;
  }, [searchParams]);

  /*
   * Penyaring isi kolom disimpan sebagai kunci berulang, bukan satu nilai
   * berkoma seperti penyaring lainnya: isinya adalah teks laporan yang
   * sebenarnya, dan nama seperti "PT Sumber Rejeki, Tbk" akan terpecah menjadi
   * dua penyaring yang keduanya tidak cocok apa pun.
   */
  const nilai = useMemo(() => searchParams.getAll('nilai').filter(Boolean), [searchParams]);

  const departemen = useMemo(() => daftar.departemen.map(Number), [daftar]);
  const pengguna = useMemo(() => daftar.pengguna.map(Number), [daftar]);
  const template = useMemo(() => daftar.template.map(Number), [daftar]);
  const status = daftar.status;

  const terapkan = useCallback(
    (ubah: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      ubah(params);

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  /** Mengganti isi satu penyaring berdaftar. */
  const atur = useCallback(
    (kunci: KunciDaftar, nilai: (string | number)[]) => {
      terapkan((params) => {
        if (nilai.length === 0) params.delete(kunci);
        else params.set(kunci, nilai.join(','));
      });
    },
    [terapkan],
  );

  /**
   * Menyaring ke satu nilai, atau melepasnya bila sudah menjadi satu-satunya
   * yang terpilih.
   *
   * Inilah yang dijalankan saat batang grafik, baris tabel, atau badge status
   * ditekan. Menekan hal yang sama dua kali mengembalikan keadaan semula —
   * tanpa itu, pengguna yang tidak sengaja menyaring harus mencari tombol
   * Bersihkan untuk kembali, dan pada halaman yang tinggal satu kartu tombol
   * itu tidak terlihat sama sekali.
   */
  const saring = useCallback(
    (kunci: KunciDaftar, nilai: string | number) => {
      const isi = daftar[kunci];
      const teks = String(nilai);
      const sudahSendiri = isi.length === 1 && isi[0] === teks;

      atur(kunci, sudahSendiri ? [] : [teks]);
    },
    [atur, daftar],
  );

  /** Menambah atau membuang satu nilai tanpa mengganggu yang lain. */
  const alihkan = useCallback(
    (kunci: KunciDaftar, nilai: string | number) => {
      const isi = daftar[kunci];
      const teks = String(nilai);

      atur(kunci, isi.includes(teks) ? isi.filter((satu) => satu !== teks) : [...isi, teks]);
    },
    [atur, daftar],
  );

  const hanya = useCallback(
    (kunci: KunciDaftar, nilai: string | number) => {
      const isi = daftar[kunci];

      return isi.length === 1 && isi[0] === String(nilai);
    },
    [daftar],
  );

  /**
   * Mempersempit rentang ke satu hari.
   *
   * Dipakai saat sebuah titik pada grafik harian atau satu sel peta panas
   * ditekan: pertanyaan berikutnya yang muncul hampir selalu "hari itu
   * sebenarnya terjadi apa".
   */
  const saringTanggal = useCallback(
    (tanggal: string) => {
      const sudahSendiri =
        searchParams.get('dari') === tanggal && searchParams.get('sampai') === tanggal;

      terapkan((params) => {
        if (sudahSendiri) {
          params.delete('dari');
          params.delete('sampai');

          return;
        }

        params.set('dari', tanggal);
        params.set('sampai', tanggal);
      });
    },
    [searchParams, terapkan],
  );

  /**
   * Menyaring menurut isi satu kolom laporan, atau melepasnya bila sudah
   * berlaku.
   *
   * Penyaring inilah yang menjawab pertanyaan yang paling sering diajukan
   * seorang Direktur: "tampilkan semua yang untuk pembeli ini". Beberapa kolom
   * berbeda dapat aktif sekaligus — pembeli **dan** tahapan — tetapi satu kolom
   * yang sama diganti, bukan ditumpuk: dua nilai pada kolom yang sama tidak
   * pernah muncul bersamaan pada satu baris, sehingga hasilnya selalu kosong.
   */
  const saringNilai = useCallback(
    (kunci: string, isi: string) => {
      const butir = `${kunci}:${isi}`;

      terapkan((params) => {
        const lain = nilai.filter((satu) => !satu.startsWith(`${kunci}:`));
        const sudahBerlaku = nilai.includes(butir);

        params.delete('nilai');

        for (const satu of sudahBerlaku ? lain : [...lain, butir]) {
          params.append('nilai', satu);
        }
      });
    },
    [nilai, terapkan],
  );

  const buangNilai = useCallback(
    (butir: string) => {
      terapkan((params) => {
        params.delete('nilai');

        for (const satu of nilai.filter((lain) => lain !== butir)) {
          params.append('nilai', satu);
        }
      });
    },
    [nilai, terapkan],
  );

  const pilihMetrik = useCallback(
    (penanda: string) => terapkan((params) => params.set('metrik', penanda)),
    [terapkan],
  );

  const bersihkan = useCallback(() => router.push(pathname), [pathname, router]);

  const jumlahPenyaring =
    KUNCI_DAFTAR.reduce((jumlah, kunci) => jumlah + daftar[kunci].length, 0) +
    nilai.length +
    (searchParams.get('dari') !== null || searchParams.get('sampai') !== null ? 1 : 0);

  return {
    dari: searchParams.get('dari'),
    sampai: searchParams.get('sampai'),
    metrik: searchParams.get('metrik'),
    departemen,
    status,
    pengguna,
    template,
    nilai,
    daftar,
    terapkan,
    atur,
    saring,
    alihkan,
    hanya,
    saringTanggal,
    saringNilai,
    buangNilai,
    pilihMetrik,
    bersihkan,
    /** Apakah satu departemen sedang menjadi satu-satunya penyaring. */
    hanyaDepartemen: (id: number) => hanya('departemen', id),
    aturDepartemen: (id: number[]) => atur('departemen', id),
    saringDepartemen: (id: number) => saring('departemen', id),
    alihkanDepartemen: (id: number) => alihkan('departemen', id),
    jumlahPenyaring,
    adaPenyaring: jumlahPenyaring > 0,
  };
}
