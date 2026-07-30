'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Menu, UserRound, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { DURASI, EASE_KELUAR } from '@/lib/gerak';
import { menuAktif, type MenuUtama } from '@/lib/nav';

/**
 * Drawer navigasi untuk layar sempit (React Bits — Staggered Menu),
 * disesuaikan token DAMS.
 *
 * Item menu masuk bergiliran dari kanan sehingga arah bukaannya terbaca.
 *
 * **Ini bukan permanent sidebar.** Standarisasi §2.1 melarang sidebar tetap
 * dan §30 menetapkan Horizontal Top Navigation Bar sebagai standar wajib.
 * Drawer ini hanya muncul saat tombol menu ditekan di layar sempit, lalu
 * tertutup lagi.
 */
export function StaggeredMenu({
  menu,
  nama,
  keteranganPengguna,
  onKeluar,
}: {
  menu: MenuUtama[];
  nama: string;
  keteranganPengguna: string;
  onKeluar: () => void;
}) {
  const pathname = usePathname();
  const [terbuka, setTerbuka] = useState(false);

  return (
    <Dialog.Root open={terbuka} onOpenChange={setTerbuka}>
      <Dialog.Trigger
        aria-label="Buka menu"
        className="grid size-8 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </Dialog.Trigger>

      <AnimatePresence>
        {terbuka && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURASI.standar }}
                className="fixed inset-0 z-40 bg-ink/30"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: DURASI.kompleks, ease: EASE_KELUAR }}
                className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-modal"
              >
                <Dialog.Title className="sr-only">Menu navigasi</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Daftar halaman yang dapat Anda buka.
                </Dialog.Description>

                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-text">
                      <UserRound aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body-lg font-medium text-ink">{nama}</span>
                      <span className="block text-caption text-ink-soft">
                        {keteranganPengguna}
                      </span>
                    </span>
                  </div>

                  <Dialog.Close
                    aria-label="Tutup menu"
                    className="grid size-7 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Dialog.Close>
                </div>

                <motion.nav
                  aria-label="Menu utama"
                  className="flex-1 overflow-y-auto p-2"
                  initial="awal"
                  animate="tampil"
                  variants={{ tampil: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}
                >
                  {menu.map((item) => {
                    const aktif = menuAktif(item.href, pathname);

                    return (
                      <motion.div
                        key={item.href}
                        variants={{
                          awal: { opacity: 0, x: 24 },
                          tampil: { opacity: 1, x: 0, transition: { duration: DURASI.standar, ease: EASE_KELUAR } },
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setTerbuka(false)}
                          aria-current={aktif ? 'page' : undefined}
                          className={cn(
                            'block rounded-control px-3 py-2 text-body-lg transition-colors duration-fast',
                            aktif
                              ? 'bg-primary-subtle font-semibold text-primary-text'
                              : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                          )}
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>

                <div className="border-t border-line p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTerbuka(false);
                      onKeluar();
                    }}
                    className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-body-lg text-danger-text transition-colors duration-fast hover:bg-danger-subtle"
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Keluar
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
