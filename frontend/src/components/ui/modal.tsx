'use client';

import { useState, type ReactNode } from 'react';
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from 'react-aria-components';
import { X } from 'lucide-react';

import { WadahOverlayProvider } from '@/components/ui/wadah-overlay';
import { cn } from '@/lib/cn';

interface ModalProps {
  terbuka: boolean;
  onTutup: () => void;
  judul: string;
  /** Hanya bila tanpa penjelasan ini maksud modal tidak jelas (standar §8). */
  keterangan?: string;
  children: ReactNode;
  /**
   * Tombol aksi di kanan bawah: Batal lalu aksi utama (standar §22.1).
   *
   * Boleh dikosongkan bila isi modal sudah punya tombolnya sendiri — mis.
   * wizard, yang tombol Lanjut dan Kembali-nya menyatu dengan langkahnya.
   */
  aksi?: ReactNode;
  lebar?: 'sedang' | 'lebar';
}

/**
 * Modal untuk form ringkas (≤ 8 field) dan dialog konfirmasi (standar §22.1).
 *
 * Memakai React Aria (docs/standar-interaksi.md §5.1): fokus terkunci di dalam
 * modal, dikembalikan ke pemicunya saat ditutup, dan isi di belakangnya
 * disembunyikan dari pembaca layar.
 *
 * Gerakan masuk-keluar memakai atribut `data-entering` dan `data-exiting`
 * milik React Aria, sehingga animasinya ditangani CSS — komponen tetap
 * menerima input selama animasi berjalan.
 *
 * Judul dan baris tombol **tetap di tempatnya**; hanya badan modal yang
 * menggulir (docs/standar-ui-ux.md §7.2). Pada isi yang panjang, judul yang
 * ikut tergulir membuat pengguna kehilangan konteks, dan tombol simpan yang
 * tersembunyi di bawah membuatnya mengira modal itu tidak punya tombol.
 *
 * Form panjang atau yang punya lampiran memakai halaman tersendiri.
 */
export function Modal({
  terbuka,
  onTutup,
  judul,
  keterangan,
  children,
  aksi,
  lebar = 'sedang',
}: ModalProps) {
  /*
   * Simpul modal dipakai sebagai wadah portal bagi komponen popup Radix di
   * dalamnya — lihat `wadah-overlay.tsx`. Memakai state, bukan ref, agar
   * komponen anak ikut dirender ulang begitu simpulnya tersedia.
   */
  const [simpulModal, setSimpulModal] = useState<HTMLElement | null>(null);

  return (
    <ModalOverlay
      isOpen={terbuka}
      onOpenChange={(nilai) => !nilai && onTutup()}
      /*
       * `isDismissable` sengaja tidak dipakai.
       *
       * Deteksi "klik di luar" milik React Aria memakai pendengar di tingkat
       * dokumen. Ketika komponen popup Radix — Select, DropdownMenu — sedang
       * terbuka, Radix memasang `pointer-events: none` pada elemen di
       * sekitarnya, sehingga sasaran klik meleset ke elemen di luar modal.
       * React Aria lalu membacanya sebagai klik di luar dan ikut menutup
       * modal, padahal pengguna hanya membubarkan daftar pilihan.
       *
       * Penutupan lewat latar ditangani sendiri di bawah: hanya bila yang
       * ditekan benar-benar elemen latar, bukan keturunannya. Deterministik,
       * dan kebal terhadap portal maupun pengaturan pointer-events.
       */
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onTutup();
      }}
      className={cn(
        'fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4',
        'data-[entering]:animate-memudar-masuk',
        'data-[exiting]:animate-memudar-keluar',
      )}
    >
      <AriaModal
        ref={setSimpulModal}
        className={cn(
          // Tinggi dibatasi, dan yang menggulir hanya badannya — lihat catatan
          // di atas.
          'flex max-h-[85vh] w-full flex-col overflow-hidden rounded-modal bg-surface shadow-modal',
          'data-[entering]:animate-modal-masuk',
          'data-[exiting]:animate-modal-keluar',
          lebar === 'lebar' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <Dialog className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <WadahOverlayProvider wadah={simpulModal}>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <Heading slot="title" className="font-heading text-section-title text-ink">
                    {judul}
                  </Heading>
                  {keterangan && (
                    <p className="mt-0.5 text-body text-ink-muted">{keterangan}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Tutup"
                  className="grid size-7 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

              {aksi && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-3">
                  {aksi}
                </div>
              )}
            </WadahOverlayProvider>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
