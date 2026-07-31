'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'motion/react';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';

import { Dock } from '@/components/layout/dock';
import { LoncengNotifikasi } from '@/components/layout/lonceng-notifikasi';
import { StaggeredMenu } from '@/components/layout/staggered-menu';
import { cn } from '@/lib/cn';
import { PEGAS } from '@/lib/gerak';
import { bolehBukaPengaturan } from '@/lib/izin';
import { menuAktif, menuUntukIzin } from '@/lib/nav';

export interface PenggunaHeader {
  nama: string;
  namaRole: string;
  /** Jumlah peran tambahan di luar peran utama. */
  peranLain: number;
  izin: string[];
  departemen: string;
}

/**
 * Horizontal Top Navigation Bar — dua baris (standar §2.1–§2.3).
 *
 * Baris 1: logo, identitas pengguna, notifikasi, pengaturan.
 * Baris 2: menu utama sesuai role, menu aktif bergaris bawah biru.
 *
 * Dilarang mengganti komponen ini dengan permanent sidebar.
 */
export function AppHeader({ pengguna }: { pengguna: PenggunaHeader }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = menuUntukIzin(pengguna.izin);
  const [keluarSedangDiproses, setKeluarSedangDiproses] = useState(false);

  /*
   * Peran majemuk diringkas: "Supervisor +1". Menderetkan semuanya membuat
   * bilah navigasi melebar tak terkendali, sedangkan menyembunyikan yang lain
   * membuat pengguna tidak tahu ia memegang peran tambahan.
   */
  const labelPeran =
    pengguna.peranLain > 0 ? `${pengguna.namaRole} +${pengguna.peranLain}` : pengguna.namaRole;

  async function keluar() {
    setKeluarSedangDiproses(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

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
          <StaggeredMenu
            menu={menu}
            nama={pengguna.nama}
            keteranganPengguna={`${labelPeran} · ${pengguna.departemen}`}
            onKeluar={() => void keluar()}
          />

          <LoncengNotifikasi />

          {bolehBukaPengaturan(pengguna.izin) && (
            <Link
              href="/pengaturan"
              aria-label="Pengaturan"
              className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
            >
              <Settings aria-hidden="true" className="size-4" />
            </Link>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className="ml-1 hidden min-w-0 items-center gap-2 rounded-control py-1 pl-1 pr-1.5 transition-colors duration-fast hover:bg-surface-muted md:flex"
              aria-label="Menu akun"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-text">
                <UserRound aria-hidden="true" className="size-4" />
              </span>
              {/* Nama tidak dipotong — `truncate` dilarang untuk isi bermakna
                  (standar §23.2). Blok ini disembunyikan di layar sempit. */}
              <span className="hidden text-left leading-tight sm:block">
                <span className="block whitespace-nowrap text-caption font-medium text-ink">
                  {pengguna.nama}
                </span>
                <span className="block whitespace-nowrap text-meta text-ink-soft">
                  {labelPeran} · {pengguna.departemen}
                </span>
              </span>
              <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-soft" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-40 min-w-48 animate-masuk-halus rounded-card border border-line bg-surface p-1 shadow-modal"
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href="/profil"
                    className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-ink-muted outline-none data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink"
                  >
                    <UserRound aria-hidden="true" className="size-4" />
                    Profil Saya
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-line" />

                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    void keluar();
                  }}
                  disabled={keluarSedangDiproses}
                  className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-danger-text outline-none data-[highlighted]:bg-danger-subtle"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  {keluarSedangDiproses ? 'Keluar...' : 'Keluar'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/*
        Baris menu hanya di layar lebar. Di layar sempit navigasinya diambil
        alih Dock di bawah dan StaggeredMenu di kanan atas.
      */}
      <nav aria-label="Menu utama" className="hidden border-t border-line bg-surface md:block">
        <ul className="mx-auto flex h-subnav max-w-container items-stretch gap-1 overflow-x-auto px-4 lg:px-8">
          {menu.map((item) => {
            const aktif = menuAktif(item.href, pathname);
            return (
              <li key={item.href} className="relative shrink-0">
                <Link
                  href={item.href}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex h-full items-center px-3 text-body-lg transition-colors duration-fast',
                    aktif ? 'font-semibold text-primary-text' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>

                {/* Penanda meluncur antar menu, bukan muncul-hilang. */}
                {aktif && (
                  <motion.span
                    layoutId="penanda-menu-utama"
                    transition={PEGAS}
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Dock menu={menu} />
    </header>
  );
}
