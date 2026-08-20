'use client';

import { useState } from 'react';
import { Loader2, Power } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/cn';
import type { HasilAksi } from '@/lib/aksi';
import type { StatusPemeliharaan } from '@/lib/pemeliharaan';
import { aturPemeliharaan } from './actions';

export function KontrolPemeliharaan({ awal }: { awal: StatusPemeliharaan }) {
  const [aktif, setAktif] = useState(awal.aktif);
  const [pesan, setPesan] = useState(awal.pesan ?? '');
  const [memproses, setMemproses] = useState<'nyala' | 'mati' | 'pesan' | null>(null);
  const [hasil, setHasil] = useState<HasilAksi | null>(null);

  async function simpan(nyalakan: boolean, mode: 'nyala' | 'mati' | 'pesan') {
    setMemproses(mode);
    setHasil(null);

    const r = await aturPemeliharaan(nyalakan, pesan);

    setMemproses(null);
    setHasil(r);
    if (r.berhasil) setAktif(nyalakan);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-lg text-ink">Status saat ini:</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium',
              aktif ? 'bg-danger-subtle text-danger-text' : 'bg-secondary-subtle text-secondary-text',
            )}
          >
            <span className={cn('size-1.5 rounded-full', aktif ? 'bg-danger' : 'bg-secondary')} />
            {aktif ? 'Aktif — pengguna terkunci' : 'Nonaktif'}
          </span>
        </div>
        <p className="mt-2 text-body text-ink-muted">
          Saat aktif, seluruh pengguna melihat halaman pemeliharaan. Administrator tetap dapat
          masuk dan memakai aplikasi untuk memverifikasi lalu mematikannya kembali.
        </p>
      </section>

      <section className="rounded-card border border-line bg-surface p-4">
        <label htmlFor="pesan-pemeliharaan" className="field-label">
          Pesan untuk pengguna (opsional)
        </label>
        <textarea
          id="pesan-pemeliharaan"
          value={pesan}
          onChange={(event) => setPesan(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Mis. Sistem sedang diperbarui. Silakan coba lagi pukul 14.00 WIB."
          className="field mt-1"
        />
        <p className="mt-1 text-caption text-ink-soft">
          Ditampilkan di halaman pemeliharaan. Kosongkan untuk memakai pesan bawaan.
        </p>
      </section>

      {hasil && <Alert jenis={hasil.berhasil ? 'berhasil' : 'galat'} pesan={hasil.pesan} />}

      <div className="flex flex-wrap gap-2">
        {aktif ? (
          <>
            <button
              type="button"
              onClick={() => void simpan(false, 'mati')}
              disabled={memproses !== null}
              className="btn-secondary btn-sm"
            >
              {memproses === 'mati' ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Power aria-hidden="true" className="size-4" />
              )}
              Matikan Mode Pemeliharaan
            </button>
            <button
              type="button"
              onClick={() => void simpan(true, 'pesan')}
              disabled={memproses !== null}
              className="btn-ghost btn-sm"
            >
              {memproses === 'pesan' ? 'Menyimpan...' : 'Perbarui Pesan'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void simpan(true, 'nyala')}
            disabled={memproses !== null}
            className="btn bg-danger text-white hover:opacity-90 btn-sm"
          >
            {memproses === 'nyala' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Power aria-hidden="true" className="size-4" />
            )}
            Nyalakan Mode Pemeliharaan
          </button>
        )}
      </div>
    </div>
  );
}
