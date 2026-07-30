'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, UserRound } from 'lucide-react';

import { cn } from '@/lib/cn';
import { LABEL_ROLE, menuAktif, menuUntukRole, type Role } from '@/lib/nav';

export interface PenggunaHeader {
  nama: string;
  role: Role;
  departemen: string;
}

interface AppHeaderProps {
  pengguna: PenggunaHeader;
}

/**
 * Horizontal Top Navigation Bar — dua baris (standar §2.1–§2.3).
 *
 * Baris 1: logo, identitas pengguna, notifikasi, pengaturan.
 * Baris 2: menu utama sesuai role, menu aktif bergaris bawah biru.
 *
 * Dilarang mengganti komponen ini dengan permanent sidebar.
 */
export function AppHeader({ pengguna }: AppHeaderProps) {
  const pathname = usePathname();
  const menu = menuUntukRole(pengguna.role);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-nav max-w-container items-center justify-between gap-4 px-4 lg:px-8">
        <Link
          href="/dashboard"
          className="font-heading text-page-title font-bold tracking-tight text-primary-text"
        >
          DAMS
        </Link>

        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            aria-label="Notifikasi"
            className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
          >
            <Bell aria-hidden="true" className="size-4" />
          </button>

          {pengguna.role === 'administrator' && (
            <Link
              href="/pengaturan"
              aria-label="Pengaturan"
              className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
            >
              <Settings aria-hidden="true" className="size-4" />
            </Link>
          )}

          <Link
            href="/profil"
            className="ml-1 flex min-w-0 items-center gap-2 rounded-control py-1 pl-1 pr-2 transition-colors duration-fast hover:bg-surface-muted"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-text">
              <UserRound aria-hidden="true" className="size-4" />
            </span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block truncate text-caption font-medium text-ink">
                {pengguna.nama}
              </span>
              <span className="block truncate text-meta text-ink-soft">
                {LABEL_ROLE[pengguna.role]} · {pengguna.departemen}
              </span>
            </span>
          </Link>
        </div>
      </div>

      <nav aria-label="Menu utama" className="border-t border-line bg-surface">
        <ul className="mx-auto flex h-subnav max-w-container items-stretch gap-1 overflow-x-auto px-4 lg:px-8">
          {menu.map((item) => {
            const aktif = menuAktif(item.href, pathname);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex h-full items-center border-b-2 px-3 text-body-lg transition-colors duration-fast',
                    aktif
                      ? 'border-primary font-semibold text-primary-text'
                      : 'border-transparent text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
