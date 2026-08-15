'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { DURASI, EASE_KELUAR } from '@/lib/gerak';

/**
 * Menawarkan pemasangan ke homescreen tanpa perlu menggali menu peramban.
 *
 * Chrome/Android memancarkan `beforeinstallprompt` pada situs yang memenuhi
 * syarat PWA (manifest + ikon + display standalone — sudah dipenuhi
 * app/manifest.ts). Acaranya ditahan, tombol sendiri ditampilkan, lalu
 * `prompt()` dipanggil saat ditekan — dialog pemasangan bawaan muncul langsung.
 *
 * iOS Safari TIDAK memancarkan acara ini dan tidak menyediakan API pasang dari
 * JavaScript sama sekali (dikunci Apple), jadi di iPhone tombol ini tidak
 * pernah muncul; pemasangan di sana hanya lewat Bagikan → Ke Layar Utama.
 *
 * Dipasang sekali di root layout supaya juga tampil di halaman masuk.
 */

type AcaraPasang = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const KUNCI_TOLAK = 'dams-pasang-ditolak';

export function PromptPasang() {
  const [acara, setAcara] = useState<AcaraPasang | null>(null);

  useEffect(() => {
    // Sudah terpasang, atau tawarannya pernah ditutup — tak perlu menawari lagi.
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    if (localStorage.getItem(KUNCI_TOLAK)) return;

    function tahan(e: Event) {
      e.preventDefault();
      setAcara(e as AcaraPasang);
    }
    function terpasang() {
      setAcara(null);
    }

    window.addEventListener('beforeinstallprompt', tahan);
    window.addEventListener('appinstalled', terpasang);

    return () => {
      window.removeEventListener('beforeinstallprompt', tahan);
      window.removeEventListener('appinstalled', terpasang);
    };
  }, []);

  async function pasang() {
    if (!acara) return;

    await acara.prompt();
    await acara.userChoice; // Acara pemasangan hanya boleh dipakai sekali.
    setAcara(null);
  }

  function tolak() {
    localStorage.setItem(KUNCI_TOLAK, '1');
    setAcara(null);
  }

  return (
    <AnimatePresence>
      {acara && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: DURASI.standar, ease: EASE_KELUAR }}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 max-md:bottom-20"
        >
          <button
            type="button"
            onClick={() => void pasang()}
            className="flex items-center gap-2 rounded-full bg-primary py-2.5 pl-4 pr-5 text-body-lg font-semibold text-white shadow-card transition-colors duration-fast hover:bg-primary-hover"
          >
            <Download aria-hidden="true" className="size-4" />
            Pasang Aplikasi
          </button>
          <button
            type="button"
            onClick={tolak}
            aria-label="Tutup tawaran pasang"
            className="grid size-8 place-items-center rounded-full bg-surface text-ink-soft shadow-card transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
