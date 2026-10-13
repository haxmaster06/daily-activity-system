'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { DURASI, EASE_KELUAR } from '@/lib/gerak';

/**
 * Tombol mengambang yang menawarkan pemasangan ke homescreen sejak layar masuk.
 *
 * Chrome menahan `beforeinstallprompt` sampai pengguna menyentuh halaman
 * setidaknya sekali (kriteria resmi Chrome). Di layar masuk yang belum disentuh
 * acaranya belum pernah ada — jadi menunggu acara berarti tombol baru berguna
 * setelah pengguna berinteraksi. Karena itu:
 *
 * • Tombolnya ditampilkan berdasarkan platform, bukan menunggu acara — hadir
 *   sejak layar masuk.
 * • Bila acaranya sudah tertangkap (skrip inline root layout →
 *   `window.__promptPasang`), sekali tekan membuka dialog pemasangan bawaan.
 * • Bila belum, ketukan tombol inilah yang memenuhi syarat Chrome; komponen
 *   menunggu sebentar acaranya tiba lalu membuka dialognya otomatis — tanpa
 *   menuntut ketukan kedua. Bila tak kunjung tiba, barulah cara pasang lewat
 *   menu ditampilkan.
 *
 * iOS Safari tak pernah memancarkan acara itu dan tak punya API pasang dari
 * JavaScript sama sekali (dikunci Apple); di sana tombol membuka petunjuk
 * Bagikan → Ke Layar Utama, satu-satunya cara memasang di iPhone.
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

type Platform = 'ios' | 'android' | null;

const KUNCI_TOLAK = 'dams-pasang-ditolak';
const ACARA_SIAP = 'promptpasang:siap';
const TUNGGU_ACARA = 2500; // Batas menanti acara tiba sesudah ketukan pertama.

function deteksiPlatform(): Platform {
  const ua = navigator.userAgent;
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ menyamar sebagai Mac; dikenali dari layar sentuhnya.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (iOS) {
    // Hanya Safari yang bisa memasang di iOS. ponytail: peramban dalam-aplikasi
    // sulit dibedakan sempurna, petunjuknya tetap tak menyesatkan.
    return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua) ? 'ios' : null;
  }
  if (/android/i.test(ua)) return 'android';

  return null;
}

export function PromptPasang() {
  const [acara, setAcara] = useState<AcaraPasang | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [bukaPetunjuk, setBukaPetunjuk] = useState(false);
  const [menyiapkan, setMenyiapkan] = useState(false);
  const menungguRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Sudah terpasang (standalone), atau tawarannya pernah ditutup.
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    if ((navigator as { standalone?: boolean }).standalone === true) return;
    if (localStorage.getItem(KUNCI_TOLAK)) return;

    function segarkan() {
      const a = window.__promptPasang ?? null;
      setAcara(a);
      // Pengguna sudah menekan Pasang sebelum acaranya siap; begitu tiba, buka
      // dialognya otomatis tanpa menuntut ketukan kedua.
      if (a && menungguRef.current) {
        menungguRef.current = false;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setMenyiapkan(false);
        void bukaDialog(a);
      }
    }
    function terpasang() {
      window.__promptPasang = null;
      setAcara(null);
      setPlatform(null);
    }
    segarkan();
    setPlatform(deteksiPlatform());
    window.addEventListener(ACARA_SIAP, segarkan);
    window.addEventListener('appinstalled', terpasang);

    return () => {
      window.removeEventListener(ACARA_SIAP, segarkan);
      window.removeEventListener('appinstalled', terpasang);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function bukaDialog(e: AcaraPasang) {
    try {
      await e.prompt();
      const { outcome } = await e.userChoice;
      window.__promptPasang = null;
      setAcara(null);
      if (outcome === 'accepted') setPlatform(null);
    } catch {
      // Sebagian Chrome menuntut gestur untuk prompt(); bila ditolak, tawarkan
      // jalur menu sebagai gantinya.
      setBukaPetunjuk(true);
    }
  }

  function utama() {
    if (acara) {
      void bukaDialog(acara);

      return;
    }
    if (platform === 'ios') {
      setBukaPetunjuk((buka) => !buka);

      return;
    }

    // Android belum terpersenjatai: ketukan inilah yang memenuhi syarat Chrome.
    // Tunggu sebentar acaranya tiba lalu buka otomatis; bila tidak, ke menu.
    menungguRef.current = true;
    setMenyiapkan(true);
    timerRef.current = window.setTimeout(() => {
      if (!menungguRef.current) return;
      menungguRef.current = false;
      setMenyiapkan(false);
      setBukaPetunjuk(true);
    }, TUNGGU_ACARA);
  }

  function tolak() {
    localStorage.setItem(KUNCI_TOLAK, '1');
    window.__promptPasang = null;
    setAcara(null);
    setPlatform(null);
  }

  const tampil = acara !== null || platform !== null;

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
          {bukaPetunjuk && !acara && platform && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-card border border-line bg-surface p-3 text-left shadow-card">
              <p className="text-body text-ink">
                {platform === 'ios' ? (
                  <>
                    Buka di Safari, ketuk ikon{' '}
                    <Share aria-hidden="true" className="inline size-3.5 align-text-bottom" />{' '}
                    Bagikan di bilahnya, lalu pilih{' '}
                    <span className="font-semibold">Ke Layar Utama</span>.
                  </>
                ) : (
                  <>
                    Buka menu peramban (⋮), lalu pilih{' '}
                    <span className="font-semibold">Instal aplikasi</span> atau{' '}
                    <span className="font-semibold">Tambahkan ke Layar utama</span>.
                  </>
                )}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={utama}
            disabled={menyiapkan}
            aria-expanded={acara ? undefined : bukaPetunjuk}
            className="flex items-center gap-2 rounded-full bg-primary py-2.5 pl-4 pr-5 text-body-lg font-semibold text-white shadow-card transition-colors duration-fast hover:bg-primary-hover disabled:opacity-70"
          >
            <Download aria-hidden="true" className="size-4" />
            {menyiapkan ? 'Menyiapkan…' : 'Pasang Aplikasi'}
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
