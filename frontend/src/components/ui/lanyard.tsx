'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';

import { cn } from '@/lib/cn';

/**
 * three.js menyentuh `window` saat modulnya dibaca, sehingga bagian 3D-nya
 * tidak boleh ikut dirender di server.
 *
 * Dimuat terpisah juga berarti berkas three, drei, dan rapier hanya diunduh
 * oleh halaman yang benar-benar memakainya — halaman lain tidak ikut
 * menanggung biayanya.
 */
const Lanyard3D = dynamic(
  () => import('@/components/ui/lanyard-3d').then((modul) => modul.Lanyard3D),
  { ssr: false, loading: () => <KartuDiam /> },
);

interface LanyardProps {
  /** Nama pada kartu. Kosong berarti kartu menampilkan nama aplikasi. */
  nama?: string;
  /** Baris kedua, mis. "Staff · Produksi". */
  keterangan?: string;
  /** Foto pengguna. Kosong berarti kartu memakai tanda DAMS. */
  fotoUrl?: string;
  className?: string;
}

/**
 * Kartu identitas menggantung (React Bits — Lanyard).
 *
 * Kartunya dapat diseret dan berayun sendiri sampai berhenti, memakai mesin
 * fisika Rapier.
 *
 * Pada `prefers-reduced-motion` seluruh bagian 3D dilewati dan diganti kartu
 * diam. Bukan sekadar mematikan animasi: memuat three.js untuk sesuatu yang
 * tidak akan bergerak hanya membuang waktu dan daya (standar UI/UX §4.4).
 */
export function Lanyard({ nama, keterangan, fotoUrl, className }: LanyardProps) {
  const kurangiGerak = useReducedMotion();

  const namaTampil = nama ?? 'DAMS';
  const keteranganTampil = keterangan ?? 'Sistem Monitoring Aktivitas Harian';

  return (
    /*
     * Kanvas sengaja menjulur ke atas melewati kartu halaman, sehingga
     * talinya terlihat menggantung dari luar layar — lebih menyerupai tali
     * yang sebenarnya daripada tali yang terpotong di tepi kartu.
     *
     * `z-0` menaruhnya di lapisan bawah: bilah navigasi ber-`z-30`, jadi
     * tali lewat di belakangnya dan klik pada navigasi tetap mengenai
     * navigasi, bukan kanvas.
     */
    <div className={cn('relative z-0 -mt-32 h-[32rem] w-72 select-none', className)}>
      {kurangiGerak ? (
        <KartuDiam nama={namaTampil} keterangan={keteranganTampil} />
      ) : (
        <Lanyard3D nama={namaTampil} keterangan={keteranganTampil} fotoUrl={fotoUrl} />
      )}
    </div>
  );
}

/**
 * Kartu versi diam.
 *
 * Dipakai selama bagian 3D masih dimuat, dan sebagai pengganti tetap pada
 * `prefers-reduced-motion`.
 */
function KartuDiam({
  nama = 'DAMS',
  keterangan = 'Sistem Monitoring Aktivitas Harian',
}: {
  nama?: string;
  keterangan?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-start">
      {/* Tali versi diam ikut menjulur ke atas layar. */}
      <span aria-hidden="true" className="h-28 w-2 bg-primary-text/85" />
      <span aria-hidden="true" className="h-2.5 w-6 rounded-sm border border-line-strong bg-surface-sunken" />

      <div className="w-40 overflow-hidden rounded-card border border-line bg-surface shadow-paper">
        <p className="bg-primary-text py-1.5 text-center font-heading text-body-lg font-bold text-white">
          DAMS
        </p>

        <div className="flex flex-col items-center gap-1.5 px-3 py-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary-subtle text-primary-text">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="size-7">
              <path
                d="m14 25 8 8 14-16"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="block text-body-lg font-semibold leading-tight text-ink">{nama}</span>
          <span className="block text-caption leading-tight text-ink-muted">{keterangan}</span>

          <span aria-hidden="true" className="mt-1 h-px w-full bg-line" />

          <span className="text-meta font-semibold uppercase tracking-wider text-ink-soft">
            CV Hasil Barokah Mandiri
          </span>
        </div>
      </div>
    </div>
  );
}
