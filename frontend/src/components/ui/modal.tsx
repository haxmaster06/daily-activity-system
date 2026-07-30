'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

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
 * Dapat ditutup dengan Escape dan klik area luar — perilaku bawaan Radix.
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
    <Dialog.Root open={terbuka} onOpenChange={(nilai) => !nilai && onTutup()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-latar fixed inset-0 z-40 bg-ink/25" />
        <Dialog.Content
          className={`anim-modal fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-modal bg-surface shadow-modal ${
            lebar === 'lebar' ? 'sm:max-w-2xl' : 'sm:max-w-md'
          }`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-section-title text-ink">
                {judul}
              </Dialog.Title>
              {keterangan ? (
                <Dialog.Description className="mt-0.5 text-body text-ink-muted">
                  {keterangan}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{judul}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Tutup"
              className="grid size-7 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          <div className="px-4 py-4">{children}</div>

          {aksi && (
            <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
              {aksi}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
