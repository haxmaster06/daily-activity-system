'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { DURASI, EASE_KELUAR } from '@/lib/gerak';

/**
 * Menawarkan pemasangan ke homescreen tanpa perlu menggali menu peramban.
 *
 * Dua jalur, karena dua platform berperilaku sangat berbeda:
 *
 * • Chrome/Android memancarkan `beforeinstallprompt` saat halaman dimuat, sering
 *   kali SEBELUM React selesai hidrasi. Listener di dalam komponen ini akan
 *   terlambat dan melewatkannya — itulah kenapa tombol dulu baru muncul setelah
 *   berpindah halaman, bukan sejak layar masuk. Karena itu penangkapannya
 *   dilakukan skrip klasik di root layout yang jalan lebih dulu (window
 *   `__promptPasang` + acara `promptpasang:siap`); komponen ini hanya
 *   memantulkannya. Sekali tekan → dialog pemasangan bawaan langsung muncul.
 *
 * • iOS Safari TIDAK memancarkan acara itu dan tak punya API pasang dari
 *   JavaScript sama sekali (dikunci Apple). Tak ada tombol yang bisa memasang
 *   langsung di iPhone. Yang bisa ditawarkan hanyalah petunjuk: ketuk Bagikan →
 *   Ke Layar Utama. Maka di iOS tombolnya membuka petunjuk itu, bukan dialog.
 */

type AcaraPasang = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    __promptPasang?: AcaraPasang | null;
  }
}

const KUNCI_TOLAK = 'dams-pasang-ditolak';
const ACARA_SIAP = 'promptpasang:siap';

/** iOS Safari sejati — bukan Chrome-iOS/peramban dalam-aplikasi yang tak bisa memasang. */
function iosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ menyamar sebagai Mac; dikenali dari layar sentuhnya.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);

  return iOS && safari;
  // ponytail: peramban dalam-aplikasi iOS (mis. WhatsApp) sulit dibedakan dan
  // memang tak bisa memasang; petunjuknya tetap tampil dan tak menyesatkan.
}

export function PromptPasang() {
  const [acara, setAcara] = useState<AcaraPasang | null>(null);
  const [modeIos, setModeIos] = useState(false);
  const [bukaPetunjuk, setBukaPetunjuk] = useState(false);

  useEffect(() => {
    // Sudah terpasang (standalone), atau tawarannya pernah ditutup.
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    if ((navigator as { standalone?: boolean }).standalone === true) return;
    if (localStorage.getItem(KUNCI_TOLAK)) return;

    // Chromium: pantulkan hasil tangkapan skrip inline root layout.
    function segarkan() {
      setAcara(window.__promptPasang ?? null);
    }
    segarkan();
    window.addEventListener(ACARA_SIAP, segarkan);

    // iOS: tak ada acara sama sekali; tawarkan petunjuk.
    if (iosSafari()) setModeIos(true);

    return () => window.removeEventListener(ACARA_SIAP, segarkan);
  }, []);

  async function pasang() {
    if (!acara) return;

    await acara.prompt();
    await acara.userChoice; // Acara pemasangan hanya boleh dipakai sekali.
    window.__promptPasang = null;
    setAcara(null);
  }

  function utama() {
    if (acara) {
      void pasang();

      return;
    }
    // iOS: buka/tutup petunjuk.
    setBukaPetunjuk((buka) => !buka);
  }

  function tolak() {
    localStorage.setItem(KUNCI_TOLAK, '1');
    window.__promptPasang = null;
    setAcara(null);
    setModeIos(false);
  }

  const tampil = acara !== null || modeIos;

  return (
    <AnimatePresence>
      {tampil && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: DURASI.standar, ease: EASE_KELUAR }}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 max-md:bottom-20"
        >
          {bukaPetunjuk && modeIos && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-card border border-line bg-surface p-3 text-left shadow-card">
              <p className="text-body text-ink">
                Buka di Safari, ketuk ikon{' '}
                <Share aria-hidden="true" className="inline size-3.5 align-text-bottom" /> Bagikan di
                bilahnya, lalu pilih <span className="font-semibold">Ke Layar Utama</span>.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={utama}
            aria-expanded={modeIos ? bukaPetunjuk : undefined}
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
