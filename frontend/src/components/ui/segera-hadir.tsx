import type { ReactNode } from 'react';
import { Clock3 } from 'lucide-react';

/**
 * Panel untuk fitur yang sudah punya tempat di navigasi, tetapi isinya belum.
 *
 * Menyediakan tempatnya lebih dulu adalah keputusan sadar: orang yang mencari
 * KPI menemukan jawaban "sedang disiapkan" alih-alih menu yang tidak ada, dan
 * tidak ada yang perlu menebak apakah fiturnya hilang atau belum pernah ada.
 *
 * Tanpa tanggal perkiraan. Tanggal yang ditulis di layar lalu terlewat
 * merusak kepercayaan lebih besar daripada tidak menyebutkan apa pun.
 */
export function SegeraHadir({
  judul,
  keterangan,
  children,
}: {
  judul: string;
  keterangan: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-6 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-subtle">
        <Clock3 aria-hidden="true" className="size-5 text-primary-text" />
      </span>

      <h2 className="mt-3 font-heading text-section-title text-ink">{judul}</h2>

      <p className="mx-auto mt-1.5 max-w-prose text-body-lg text-ink-muted">{keterangan}</p>

      {children && <div className="mt-3 text-body text-ink-soft">{children}</div>}
    </section>
  );
}
