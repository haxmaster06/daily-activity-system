'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, Pencil, Plus, Trash2, Users } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatAngka } from '@/lib/format';
import type { Departemen } from '@/lib/master-data';
import { hapusDepartemen } from './actions';
import { DepartmentDialog } from './department-dialog';

export function DepartmentGrid({ departemen }: { departemen: Departemen[] }) {
  const router = useRouter();

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Departemen | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Departemen | null>(null);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);

  function buka(target: Departemen | null) {
    setSedangDiubah(target);
    setDialogTerbuka(true);
  }

  async function hapus() {
    if (!konfirmasiHapus) return;

    const hasil = await hapusDepartemen(konfirmasiHapus.id);

    setKonfirmasiHapus(null);
    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">Manajemen Departemen</h1>
        <button type="button" onClick={() => buka(null)} className="btn-primary btn-sm">
          <Plus aria-hidden="true" className="size-4" />
          Tambah Departemen
        </button>
      </div>

      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      {departemen.length === 0 ? (
        <div className="card p-8 text-center text-body-lg text-ink-soft">
          Belum ada departemen.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departemen.map((item) => (
            <div key={item.id} className="card flex flex-col gap-3 p-3">
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary-text">
                  <Building2 aria-hidden="true" className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-section-title text-ink">{item.nama}</h2>
                  <p className="mt-0.5 font-mono text-caption text-ink-soft">{item.kode}</p>
                  {item.keterangan && (
                    <p className="mt-1 text-body text-ink-muted">{item.keterangan}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => buka(item)}
                    aria-label={`Ubah departemen ${item.nama}`}
                    title="Ubah"
                    className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonfirmasiHapus(item)}
                    aria-label={`Hapus departemen ${item.nama}`}
                    title="Hapus"
                    className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
                <span className="flex items-center gap-1.5 text-caption text-ink-muted">
                  <Users aria-hidden="true" className="size-3.5" />
                  {formatAngka(item.jumlah_anggota ?? 0)} anggota
                </span>

                {!item.aktif && (
                  <span className="rounded-control bg-surface-sunken px-1.5 py-0.5 text-caption font-medium text-ink-muted">
                    Nonaktif
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentDialog
        terbuka={dialogTerbuka}
        onTutup={() => setDialogTerbuka(false)}
        departemen={sedangDiubah}
      />

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        onSetuju={hapus}
        judul="Hapus Departemen"
        pesan={`Departemen ${konfirmasiHapus?.nama ?? ''} akan dihapus permanen. Departemen yang masih punya anggota tidak dapat dihapus.`}
        labelAksi="Hapus"
        berisiko
      />
    </>
  );
}
