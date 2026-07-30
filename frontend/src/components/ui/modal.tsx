'use client';

import type { ReactNode } from 'react';
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from 'react-aria-components';
import { X } from 'lucide-react';

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
  return (
    <ModalOverlay
      isOpen={terbuka}
      onOpenChange={(nilai) => !nilai && onTutup()}
      isDismissable
      className={cn(
        'fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4',
        'data-[entering]:animate-memudar-masuk',
        'data-[exiting]:animate-memudar-keluar',
      )}
    >
      <AriaModal
        className={cn(
          'max-h-[85vh] w-full overflow-y-auto rounded-modal bg-surface shadow-modal',
          'data-[entering]:animate-modal-masuk',
          'data-[exiting]:animate-modal-keluar',
          lebar === 'lebar' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <Dialog className="outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
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

              <div className="px-4 py-4">{children}</div>

              {aksi && (
                <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
                  {aksi}
                </div>
              )}
            </>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
