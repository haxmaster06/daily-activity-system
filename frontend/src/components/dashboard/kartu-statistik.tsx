import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { AngkaHidup } from '@/components/ui/angka-hidup';
import { BorderGlowCard } from '@/components/ui/border-glow-card';
import { cn } from '@/lib/cn';

interface KartuStatistikProps {
  label: string;
  nilai: number;
  /** Menjelaskan angkanya — angka tanpa konteks dilarang (standarisasi §17). */
  keterangan: string;
  icon: LucideIcon;
  href?: string;
  ragam?: 'netral' | 'perhatian';
}

/**
 * Kartu angka pada dashboard.
 *
 * Tiap kartu selalu menyertakan keterangan: angka tanpa konteks tidak dapat
 * ditindaklanjuti pembacanya. Kartu yang dapat diklik memakai Border Glow;
 * kartu biasa tidak, supaya sorotannya tetap berarti "ini bisa dibuka".
 */
export function KartuStatistik({
  label,
  nilai,
  keterangan,
  icon: Icon,
  href,
  ragam = 'netral',
}: KartuStatistikProps) {
  const isi = (
    <div className="flex items-start gap-3 p-3">
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-control',
          ragam === 'perhatian'
            ? 'bg-accent-subtle text-accent-text'
            : 'bg-primary-subtle text-primary-text',
        )}
      >
        <Icon aria-hidden="true" className="size-4.5" />
      </span>

      <span className="min-w-0">
        <span className="block text-caption text-ink-muted">{label}</span>
        <AngkaHidup
          nilai={nilai}
          className="block font-heading text-[1.75rem] font-bold leading-tight text-ink"
        />
        <span className="mt-0.5 block text-caption text-ink-soft">{keterangan}</span>
      </span>
    </div>
  );

  if (!href) {
    return <div className="card">{isi}</div>;
  }

  return (
    <BorderGlowCard asChild>
      <Link href={href} className="block">
        {isi}
      </Link>
    </BorderGlowCard>
  );
}
