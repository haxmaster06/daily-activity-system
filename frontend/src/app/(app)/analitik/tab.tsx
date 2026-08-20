'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Building2, Factory, LayoutDashboard, Table2 } from 'lucide-react';

import { cn } from '@/lib/cn';

/*
 * Departemen didahulukan, dan itu bukan urusan selera.
 *
 * Yang dicari pembaca halaman ini adalah "Produksi sedang mengerjakan apa,
 * untuk pembeli mana" — bukan seberapa rajin timnya mengisi laporan.
 *
 * Tab Kepatuhan pernah ada di sini dan **dihapus** karena dua alasan sekaligus:
 * ia mengukur orang alih-alih pekerjaan, dan tabel per orangnya mengulang
 * halaman Monitoring yang sudah menyajikan jumlah laporan beserta hari tanpa
 * laporan, tersaring rentang dan departemen yang sama. Dua tempat untuk satu
 * pertanyaan hanya membuat keduanya lambat laun berbeda.
 */
const TAB = [
  { href: '/analitik', label: 'Departemen', Ikon: Building2, korporat: false },
  /*
   * Rekap hanya bagi jangkauan Korporat. Bukan karena datanya belum tersaring —
   * `scopeVisibleTo()` tetap berlaku — melainkan karena halaman berjudul "rekap
   * seluruh departemen" yang menampilkan satu baris adalah halaman yang
   * berbohong tentang apa yang ditawarkannya.
   */
  { href: '/analitik/rekap', label: 'Rekap', Ikon: Table2, korporat: true },
  { href: '/analitik/ringkasan', label: 'Ringkasan', Ikon: LayoutDashboard, korporat: false },
  { href: '/analitik/produksi', label: 'Proses Produksi', Ikon: Factory, korporat: false },
  { href: '/analitik/progres', label: 'Progres', Ikon: BarChart3, korporat: false },
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
export function TabAnalitik({ korporat }: { korporat: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();

  return (
    <nav aria-label="Halaman analitik" className="mb-3 border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {TAB.filter((satu) => korporat || !satu.korporat).map(({ href, label, Ikon }) => {
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
