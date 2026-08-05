'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Building2, CalendarCheck, LayoutDashboard, Scale } from 'lucide-react';

import { cn } from '@/lib/cn';

/*
 * Departemen didahulukan, dan itu bukan urusan selera.
 *
 * Yang dicari pembaca halaman ini biasanya "Produksi sedang mengerjakan apa,
 * untuk pembeli mana" — bukan seberapa rajin timnya mengisi laporan. Tab
 * kepatuhan dan produktivitas mengukur orang; itu pertanyaan yang berbeda, dan
 * jarang menjadi yang pertama.
 */
const TAB = [
  { href: '/analitik', label: 'Departemen', Ikon: Building2 },
  { href: '/analitik/ringkasan', label: 'Ringkasan', Ikon: LayoutDashboard },
  { href: '/analitik/kepatuhan', label: 'Kepatuhan', Ikon: CalendarCheck },
  { href: '/analitik/produktivitas', label: 'Produktivitas', Ikon: Scale },
  { href: '/analitik/progres', label: 'Progres', Ikon: BarChart3 },
] as const;

/**
 * Perpindahan antar halaman Analytics.
 *
 * Memakai tautan sungguhan, bukan state — tiap halaman mengambil datanya
 * sendiri di server, dan alamatnya dapat dibagikan lengkap dengan
 * penyaringannya.
 *
 * Penyaring yang sedang aktif ikut dibawa: berpindah tab lalu menemukan
 * rentang tanggalnya kembali ke bawaan adalah cara tercepat membuat orang
 * berhenti memakai penyaringnya.
 */
export function TabAnalitik() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();

  return (
    <nav aria-label="Halaman analitik" className="mb-3 border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {TAB.map(({ href, label, Ikon }) => {
          const aktif = pathname === href;

          return (
            <li key={href}>
              <Link
                href={query ? `${href}?${query}` : href}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-body-lg transition-colors duration-fast',
                  aktif
                    ? 'border-primary font-medium text-primary-text'
                    : 'border-transparent text-ink-muted hover:border-line hover:text-ink',
                )}
              >
                <Ikon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
