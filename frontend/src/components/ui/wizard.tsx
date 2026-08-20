'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { cn } from '@/lib/cn';
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
  /**
   * Melompat ke langkah tertentu dari luar.
   *
   * Dipakai saat server menolak isian: galat per kolom biasanya berada di
   * langkah yang sudah ditinggalkan, dan membiarkan pengguna di langkah
   * terakhir berarti ia hanya melihat pesan umum tanpa tahu kolom mana yang
   * bermasalah.
   *
   * `nonce` dinaikkan tiap kali lompatan diminta, supaya permintaan kedua ke
   * langkah yang sama tetap terbaca sebagai permintaan baru.
   */
  lompatKe?: { langkah: number; nonce: number };
  /**
   * Menempelkan baris tombol ke dasar wadahnya.
   *
   * Dipakai wizard yang isinya dapat tumbuh jauh melebihi satu layar —
   * penyusun template dengan 27 kolom, misalnya. Tanpa ini tombol Simpan
   * tergulir keluar dan pengguna mengira wizardnya tidak punya tombol, alasan
   * yang sama yang membuat footer Modal dipatok di docs/standar-ui-ux.md §7.2.
   *
   * Tidak dinyalakan bawaan: pada wizard yang isinya pendek, bar menempel hanya
   * memakan ruang tanpa menyelesaikan apa pun.
   */
  aksiMenempel?: boolean;
}

/**
 * Wizard untuk isian berantai (standar interaksi §3).
 *
 * Langkah yang sudah selesai dapat diklik untuk mundur; langkah di depan
 * terkunci sampai langkah sekarang sah. Isian tidak hilang saat mundur karena
 * seluruh langkah tetap ter-mount di memori pemanggil.
 */
export function Wizard({
  langkah,
  onSelesai,
  labelSelesai = 'Simpan',
  onBatal,
  lompatKe,
  aksiMenempel = false,
}: WizardProps) {
  const [aktif, setAktif] = useState(0);
  const [memproses, setMemproses] = useState(false);
  const arah = useRef(1);

  const nonceTerakhir = useRef(lompatKe?.nonce ?? 0);

  useEffect(() => {
    if (lompatKe === undefined || lompatKe.nonce === nonceTerakhir.current) return;

    nonceTerakhir.current = lompatKe.nonce;
    arah.current = -1;
    setAktif(Math.max(0, Math.min(langkah.length - 1, lompatKe.langkah)));
  }, [lompatKe, langkah.length]);

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

      <div
        className={cn(
          'flex items-center justify-between gap-2 border-t border-line pt-3',
          // `z-20`: di bawah kerangka aplikasi (z-30/z-40, §13), di atas header
          // tabel yang menempel. Jarak bawah pada layar sempit menghindari dock.
          aksiMenempel &&
            'sticky bottom-0 z-20 -mx-1 bg-surface/95 px-1 pb-3 backdrop-blur max-md:mb-16',
        )}
      >
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
