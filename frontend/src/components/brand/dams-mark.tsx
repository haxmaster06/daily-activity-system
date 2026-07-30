import { cn } from '@/lib/cn';

/**
 * Tanda visual DAMS: roda gigi (proses produksi) dengan centang (aktivitas
 * selesai), mengikuti arah logo pada mockup.
 *
 * Dibuat sebagai SVG inline, bukan berkas gambar dari server luar, agar
 * halaman masuk tidak bergantung pada jaringan eksternal. Ganti berkas ini
 * bila logo resmi perusahaan sudah tersedia.
 */
export function DamsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Logo DAMS"
      className={cn('size-10', className)}
    >
      <path
        d="M24 5.5 27.9 8h4.6l1.2 4.4 3.9 2.3.1 4.6 3.3 3.2-2 4.1 1 4.5-4 2.2-1.6 4.3-4.6.5-3.2 3.3-4.2-1.9-4.2 1.9-3.2-3.3-4.6-.5-1.6-4.3-4-2.2 1-4.5-2-4.1 3.3-3.2.1-4.6 3.9-2.3L13.5 8h4.6L24 5.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m17.5 24.5 4.8 4.8 8.2-9.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
