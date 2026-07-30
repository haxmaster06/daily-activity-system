'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';

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
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination, type MetaHalaman } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Departemen, Pengguna, RingkasanRole } from '@/lib/master-data';
import { ubahStatusPengguna } from './actions';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserDialog } from './user-dialog';

interface UserTableProps {
  pengguna: Pengguna[];
  meta: MetaHalaman;
  departemen: Departemen[];
  role: RingkasanRole[];
  /** Id pengguna yang sedang masuk — dirinya sendiri tidak bisa dinonaktifkan. */
  idPenggunaSaatIni: number;
}

export function UserTable({
  pengguna,
  meta,
  departemen,
  role,
  idPenggunaSaatIni,
}: UserTableProps) {
  const router = useRouter();

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Pengguna | null>(null);
  const [sedangResetSandi, setSedangResetSandi] = useState<Pengguna | null>(null);
  const [konfirmasiStatus, setKonfirmasiStatus] = useState<Pengguna | null>(null);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);

  function buka(target: Pengguna | null) {
    setSedangDiubah(target);
    setDialogTerbuka(true);
  }

  async function ubahStatus() {
    if (!konfirmasiStatus) return;

    const hasil = await ubahStatusPengguna(konfirmasiStatus.id, !konfirmasiStatus.aktif);

    setKonfirmasiStatus(null);
    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">Manajemen Pengguna</h1>
        <button type="button" onClick={() => buka(null)} className="btn-primary btn-sm">
          <Plus aria-hidden="true" className="size-4" />
          Tambah Pengguna
        </button>
      </div>

      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      <div className="card overflow-hidden">
        <FilterBar
          placeholderCari="Cari nama atau email..."
          pilihan={[
            {
              kunci: 'departemen_id',
              label: 'Departemen',
              opsi: departemen.map((item) => ({ nilai: String(item.id), label: item.nama })),
            },
            {
              kunci: 'role',
              label: 'Role',
              opsi: role.map((item) => ({ nilai: item.slug, label: item.nama })),
            },
            {
              kunci: 'status',
              label: 'Status',
              opsi: [
                { nilai: 'aktif', label: 'Aktif' },
                { nilai: 'nonaktif', label: 'Nonaktif' },
              ],
            },
          ]}
        />

        <DataTable>
          <DataTableHead>
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Departemen</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th align="right">Aksi</Th>
          </DataTableHead>
          <DataTableBody>
            {pengguna.length === 0 ? (
              <DataTableKosong
                kolom={6}
                pesan="Tidak ada pengguna yang cocok dengan penyaringan ini."
              />
            ) : (
              pengguna.map((item) => {
                const diriSendiri = item.id === idPenggunaSaatIni;

                return (
                  <tr key={item.id} className="hover:bg-surface-muted/60">
                    <Td className="font-medium">{item.nama}</Td>
                    <Td className="text-ink-muted">{item.email}</Td>
                    <Td className="text-ink-muted">{item.departemen.nama ?? '—'}</Td>
                    <Td className="text-ink-muted">{item.role.nama ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={item.aktif ? 'selesai' : 'belum_mulai'} />
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => buka(item)}
                          aria-label={`Ubah ${item.nama}`}
                          title="Ubah"
                          className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSedangResetSandi(item)}
                          aria-label={`Atur ulang kata sandi ${item.nama}`}
                          title="Atur ulang kata sandi"
                          className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                        >
                          <KeyRound aria-hidden="true" className="size-3.5" />
                        </button>

                        {!diriSendiri && (
                          <button
                            type="button"
                            onClick={() => setKonfirmasiStatus(item)}
                            aria-label={`${item.aktif ? 'Nonaktifkan' : 'Aktifkan'} ${item.nama}`}
                            title={item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                          >
                            {item.aktif ? (
                              <UserX aria-hidden="true" className="size-3.5" />
                            ) : (
                              <UserCheck aria-hidden="true" className="size-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTableBody>
        </DataTable>

        <Pagination meta={meta} satuan="pengguna" />
      </div>

      <UserDialog
        terbuka={dialogTerbuka}
        onTutup={() => setDialogTerbuka(false)}
        pengguna={sedangDiubah}
        departemen={departemen}
        role={role}
      />

      <ResetPasswordDialog
        pengguna={sedangResetSandi}
        onTutup={() => setSedangResetSandi(null)}
      />

      <ConfirmDialog
        terbuka={konfirmasiStatus !== null}
        onTutup={() => setKonfirmasiStatus(null)}
        onSetuju={ubahStatus}
        judul={konfirmasiStatus?.aktif ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
        pesan={
          konfirmasiStatus?.aktif
            ? `${konfirmasiStatus?.nama} tidak akan bisa masuk lagi dan sesinya yang sedang berjalan langsung berakhir. Laporan yang sudah dibuat tetap tersimpan.`
            : `${konfirmasiStatus?.nama} akan bisa masuk kembali menggunakan kata sandi lamanya.`
        }
        labelAksi={konfirmasiStatus?.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        berisiko={konfirmasiStatus?.aktif ?? false}
      />
    </>
  );
}
