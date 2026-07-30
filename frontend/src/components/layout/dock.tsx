'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { PEGAS } from '@/lib/gerak';
import { menuAktif, type MenuUtama } from '@/lib/nav';

const IKON: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/laporan': FileText,
  '/monitoring': Users,
  '/export': FileSpreadsheet,
  '/pengaturan': Settings,
};

/**
 * Navigasi bawah untuk layar sempit (React Bits — Dock), token DAMS.
 *
 * Ikon yang aktif membesar tipis dan labelnya menebal; penanda aktif meluncur
 * antar item memakai `layoutId`. Ikon lain tidak ikut membesar saat kursor
 * lewat — pembesaran berantai khas dock macOS terasa main-main pada aplikasi
 * kerja dan menyulitkan sasaran sentuh.
 *
 * Hanya tampil di bawah breakpoint md. Di layar lebar navigasi tetap
 * Horizontal Top Navigation Bar (standarisasi §2.1).
 */
export function Dock({ menu }: { menu: MenuUtama[] }) {
  const pathname = usePathname();
  const idPenanda = useId();
  const kurangiGerak = useReducedMotion();

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)] md:hidden',
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {menu.map((item) => {
          const Icon = IKON[item.href] ?? FileText;
          const aktif = menuAktif(item.href, pathname);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={aktif ? 'page' : undefined}
                className="relative flex flex-col items-center gap-0.5 px-1 py-2"
              >
                {aktif && (
                  <motion.span
                    layoutId={idPenanda}
                    transition={kurangiGerak ? { duration: 0 } : PEGAS}
                    aria-hidden="true"
                    className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary"
                  />
                )}

                <motion.span
                  animate={kurangiGerak ? undefined : { scale: aktif ? 1.1 : 1 }}
                  transition={PEGAS}
                  className={aktif ? 'text-primary-text' : 'text-ink-soft'}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </motion.span>

                <span
                  className={cn(
                    'text-meta leading-none',
                    aktif ? 'font-semibold text-primary-text' : 'text-ink-soft',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
