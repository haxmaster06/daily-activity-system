'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { formatAngka } from '@/lib/format';
import { labelJangkauan } from '@/lib/izin';
import type { RingkasanRole } from '@/lib/master-data';
import type { GrupIzin } from '@/lib/peran-server';
import { hapusPeran } from './actions';
import { RoleDialog } from './role-dialog';

interface RoleTableProps {
  peran: RingkasanRole[];
  katalog: GrupIzin[];
  bolehKelola: boolean;
}

export function RoleTable({ peran, katalog, bolehKelola }: RoleTableProps) {
  const router = useRouter();

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<RingkasanRole | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<RingkasanRole | null>(null);
  const [hasil, setHasil] = useState<{ jenis: 'galat' | 'berhasil'; pesan: string } | null>(
    null,
  );

  function buka(item: RingkasanRole | null) {
    setSedangDiubah(item);
    setDialogTerbuka(true);
  }

  async function konfirmasiPenghapusan() {
    if (!konfirmasiHapus) return;

    const jawaban = await hapusPeran(konfirmasiHapus.id);

    setHasil({ jenis: jawaban.berhasil ? 'berhasil' : 'galat', pesan: jawaban.pesan });
    setKonfirmasiHapus(null);

    if (jawaban.berhasil) router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">Manajemen Peran</h1>

        {bolehKelola && (
          <button type="button" onClick={() => buka(null)} className="btn-primary btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Tambah Peran
          </button>
        )}
      </div>

      {hasil && <Alert jenis={hasil.jenis} pesan={hasil.pesan} className="mb-3" />}

      <div className="card overflow-hidden">
        <DataTable>
          <DataTableHead>
            <Th>Nama Peran</Th>
            <Th>Keterangan</Th>
            <Th>Jangkauan Bawaan</Th>
            <Th align="right">Hak Akses</Th>
            <Th align="right">Pengguna</Th>
            <Th align="right">Aksi</Th>
          </DataTableHead>

          <DataTableBody>
            {peran.length === 0 ? (
              <DataTableKosong kolom={6} pesan="Belum ada peran." />
            ) : (
              peran.map((item) => (
                <tr
                  key={item.id}
                  /*
                   * Seluruh baris membuka penyuntingan peran — sasaran klik
                   * jauh lebih besar daripada ikon 28px (docs/standar-ui-ux.md
                   * §6.3).
                   */
                  role={bolehKelola ? 'button' : undefined}
                  tabIndex={bolehKelola ? 0 : undefined}
                  onClick={bolehKelola ? () => buka(item) : undefined}
                  onKeyDown={
                    bolehKelola
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            buka(item);
                          }
                        }
                      : undefined
                  }
                  aria-label={bolehKelola ? `Ubah peran ${item.nama}` : undefined}
                  className={
                    bolehKelola
                      ? 'cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none'
                      : 'hover:bg-surface-muted/60'
                  }
                >
                  <Td className="font-medium">
                    {item.nama}
                    {item.sistem && (
                      <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-meta text-ink-soft">
                        Bawaan
                      </span>
                    )}
                  </Td>
                  <Td className="text-ink-muted">{item.keterangan ?? '—'}</Td>
                  <Td className="text-ink-muted">
                    {labelJangkauan(item.jangkauan_bawaan ?? 1)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(item.izin?.length ?? 0)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(item.jumlah_pengguna ?? 0)}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Peran bawaan tidak dapat dihapus — slug-nya dipegang
                          seeder dan penjaga akses. */}
                      {bolehKelola && !item.sistem && (
                        <button
                          type="button"
                          onClick={(event) => {
                            // Tanpa ini, klik Hapus ikut memicu klik baris.
                            event.stopPropagation();
                            setKonfirmasiHapus(item);
                          }}
                          aria-label={`Hapus ${item.nama}`}
                          title="Hapus"
                          className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <p className="border-t border-line px-3 py-2 text-caption text-ink-muted">
          Menampilkan {formatAngka(peran.length)} peran. Hak akses seorang pengguna adalah
          gabungan dari seluruh perannya.
        </p>
      </div>

      <RoleDialog
        terbuka={dialogTerbuka}
        onTutup={() => setDialogTerbuka(false)}
        peran={sedangDiubah}
        katalog={katalog}
      />

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        judul="Hapus peran"
        pesan={`Peran ${konfirmasiHapus?.nama ?? ''} akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        labelAksi="Hapus"
        berisiko
        onSetuju={() => konfirmasiPenghapusan()}
      />
    </>
  );
}
