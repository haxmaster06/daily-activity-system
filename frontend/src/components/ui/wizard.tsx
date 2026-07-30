'use client';

import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { SpectacularButton } from '@/components/ui/spectacular-button';
import { Stepper } from '@/components/ui/stepper';
import { geserArah } from '@/lib/gerak';

export interface LangkahWizard {
  label: string;
  isi: ReactNode;
  /**
   * Dipanggil sebelum maju. Kembalikan `false` untuk menahan perpindahan —
   * validasi dijalankan per langkah, bukan menumpuk di akhir
   * (standar interaksi §3).
   */
  validasi?: () => boolean | Promise<boolean>;
}

interface WizardProps {
  langkah: LangkahWizard[];
  /** Dipanggil pada langkah terakhir. */
  onSelesai: () => Promise<void> | void;
  labelSelesai?: string;
  onBatal?: () => void;
}

/**
 * Wizard untuk isian berantai (standar interaksi §3).
 *
 * Langkah yang sudah selesai dapat diklik untuk mundur; langkah di depan
 * terkunci sampai langkah sekarang sah. Isian tidak hilang saat mundur karena
 * seluruh langkah tetap ter-mount di memori pemanggil.
 */
export function Wizard({ langkah, onSelesai, labelSelesai = 'Simpan', onBatal }: WizardProps) {
  const [aktif, setAktif] = useState(0);
  const [memproses, setMemproses] = useState(false);
  const arah = useRef(1);

  const langkahTerakhir = aktif === langkah.length - 1;

  async function maju() {
    const sah = (await langkah[aktif].validasi?.()) ?? true;
    if (!sah) return;

    if (langkahTerakhir) {
      setMemproses(true);
      try {
        await onSelesai();
      } finally {
        setMemproses(false);
      }
      return;
    }

    arah.current = 1;
    setAktif((n) => n + 1);
  }

  function mundur(ke?: number) {
    arah.current = -1;
    setAktif((n) => (ke === undefined ? Math.max(0, n - 1) : ke));
  }

  return (
    <div className="space-y-4">
      <Stepper
        langkah={langkah.map((item) => item.label)}
        aktif={aktif}
        onPilih={(index) => mundur(index)}
      />

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={arah.current} initial={false}>
          <motion.div
            key={aktif}
            custom={arah.current}
            variants={geserArah}
            initial="awal"
            animate="tampil"
            exit="keluar"
          >
            {langkah[aktif].isi}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <div>
          {onBatal && (
            <button type="button" onClick={onBatal} className="btn-ghost btn-sm">
              Batal
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {aktif > 0 && (
            <button type="button" onClick={() => mundur()} className="btn-ghost btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Kembali
            </button>
          )}

          {/* Aksi utama wizard — satu-satunya Spectacular Button di layar ini. */}
          <SpectacularButton
            onClick={() => void maju()}
            memproses={memproses}
            labelMemproses="Menyimpan..."
          >
            {langkahTerakhir ? (
              <>
                <Check aria-hidden="true" className="size-4" />
                {labelSelesai}
              </>
            ) : (
              <>
                Lanjut
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </SpectacularButton>
        </div>
      </div>
    </div>
  );
}
