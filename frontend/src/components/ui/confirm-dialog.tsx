'use client';

import { useState } from 'react';

import { Modal } from '@/components/ui/modal';

interface ConfirmDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  onSetuju: () => Promise<void> | void;
  judul: string;
  pesan: string;
  labelAksi: string;
  /** Tindakan berisiko memakai tombol merah. */
  berisiko?: boolean;
}

/**
 * Dialog konfirmasi untuk tindakan berisiko (standar §22.1).
 *
 * Pesan menjelaskan akibat, bukan mekanismenya (standar §25.1).
 */
export function ConfirmDialog({
  terbuka,
  onTutup,
  onSetuju,
  judul,
  pesan,
  labelAksi,
  berisiko = false,
}: ConfirmDialogProps) {
  const [memproses, setMemproses] = useState(false);

  async function jalankan() {
    setMemproses(true);
    try {
      await onSetuju();
    } finally {
      setMemproses(false);
    }
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={judul}
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={jalankan}
            disabled={memproses}
            className={
              berisiko
                ? 'btn btn-sm bg-danger text-white hover:bg-danger-text'
                : 'btn-primary btn-sm'
            }
          >
            {memproses ? 'Memproses...' : labelAksi}
          </button>
        </>
      }
    >
      <p className="text-body-lg text-ink-muted">{pesan}</p>
    </Modal>
  );
}
