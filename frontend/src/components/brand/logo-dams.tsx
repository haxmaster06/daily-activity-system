import Image from 'next/image';

import { cn } from '@/lib/cn';

/**
 * Logo resmi HBM Daily Activity.
 *
 * Dua varian, dipilih dari latar tempat ia dipasang: `warna` untuk latar
 * terang, `putih` untuk panel gelap. Aplikasi ini light mode saja, jadi
 * `warna` yang hampir selalu dipakai.
 *
 * Berkasnya dilayani dari `public/`, bukan dari server luar — halaman masuk
 * tidak boleh bergantung pada jaringan pihak ketiga.
 *
 * ---------------------------------------------------------------------------
 * Kilau
 * ---------------------------------------------------------------------------
 *
 * Satu sapuan cahaya melintas saat kursor melewati logo, lalu hilang. Bukan
 * gradient yang menetap: dalam keadaan diam logo tampil datar apa adanya,
 * sehingga larangan gradient dekoratif (standarisasi §9, CLAUDE.md) tidak
 * dilanggar — yang ada hanyalah umpan balik saat berinteraksi.
 *
 * Pita kilaunya disembunyikan sepenuhnya saat pengguna meminta gerak
 * dikurangi. `prefers-reduced-motion` adalah syarat aksesibilitas, bukan
 * pilihan (docs/standar-ui-ux.md §4.4).
 */
export function LogoDams({
  varian = 'warna',
  className,
  prioritas = false,
}: {
  varian?: 'warna' | 'putih';
  className?: string;
  /** Setel true hanya untuk logo yang tampak tanpa menggulir. */
  prioritas?: boolean;
}) {
  return (
    <span className="group relative inline-flex overflow-hidden">
      <Image
        src={varian === 'putih' ? '/logo-dams-putih.png' : '/logo-dams.png'}
        alt="HBM Daily Activity"
        width={890}
        height={364}
        priority={prioritas}
        className={cn('h-auto w-auto', className)}
      />

      {/*
        Pita kilau. Posisi diamnya di luar bingkai sebelah kiri, dan
        `overflow-hidden` pada pembungkus yang menyembunyikannya — tanpa
        opacity, sehingga tidak ada lapisan yang menumpuk di atas logo saat
        tidak sedang disentuh.
      */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-1/4',
          '-translate-x-[120%] -skew-x-12',
          'bg-gradient-to-r from-transparent via-white/55 to-transparent',
          'group-hover:animate-kilau',
          'motion-reduce:hidden',
        )}
      />
    </span>
  );
}
