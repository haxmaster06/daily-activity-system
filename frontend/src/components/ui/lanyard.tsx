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
        <KartuDiam nama={namaTampil} keterangan={keteranganTampil} fotoUrl={fotoUrl} />
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
  fotoUrl,
}: {
  nama?: string;
  keterangan?: string;
  fotoUrl?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-start">
      {/* Tali versi diam ikut menjulur ke atas layar. */}
      <span aria-hidden="true" className="h-28 w-2 bg-primary-text/85" />
      <span aria-hidden="true" className="h-2.5 w-6 rounded-sm border border-line-strong bg-surface-sunken" />

      {/*
        Tiga blok bertumpuk: foto 70%, identitas 20%, nama perusahaan 10%.
        Perbandingannya ditulis sebagai `basis`, bukan tinggi tetap, supaya kartu
        versi diam dan tekstur kartu 3D benar-benar sebangun — keduanya memakai
        angka yang sama, dan kartu yang berbeda susunannya saat animasi dimatikan
        terbaca sebagai dua kartu berbeda.
      */}
      <div className="flex aspect-[512/728] w-40 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-paper">
        <div className="relative basis-[70%] bg-primary-subtle">
          {fotoUrl ? (
            /*
             * Foto pemiliknya memenuhi bloknya, sama seperti kartu identitas
             * sungguhan. Tanda centang hanya dipakai saat belum ada foto —
             * centang yang jelas bukan foto lebih jujur daripada siluet orang
             * generik.
             *
             * `<img>` biasa, bukan `next/image`: alamatnya menunjuk route yang
             * meneruskan permintaan beserta token sesi, dan pengoptimal gambar
             * mengambilnya tanpa cookie tersebut.
             */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-primary-text">
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="size-10">
                <path
                  d="m14 25 8 8 14-16"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}

          {/* Tanda DAMS tetap ada, tetapi tidak lagi memakan satu blok sendiri. */}
          <span className="absolute left-0 top-0 rounded-br-card bg-primary-text px-2 py-0.5 font-heading text-caption font-bold text-white">
            DAMS
          </span>
        </div>

        <div className="flex basis-[20%] flex-col items-center justify-center gap-0.5 border-t border-line px-2 text-center">
          <span className="block text-caption font-semibold leading-tight text-ink">{nama}</span>
          <span className="block text-meta leading-tight text-ink-muted">{keterangan}</span>
        </div>

        <div className="grid basis-[10%] place-items-center bg-surface-muted px-2">
          <span className="text-meta font-semibold uppercase tracking-wider text-ink-soft">
            CV Hasil Barokah Mandiri
          </span>
        </div>
      </div>
    </div>
  );
}
