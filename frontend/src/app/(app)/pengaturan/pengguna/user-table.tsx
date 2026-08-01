'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, Plus, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';

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
import { formatAngka } from '@/lib/format';
import type { Departemen, Pengguna, RingkasanRole } from '@/lib/master-data';
import { hapusPengguna, ubahStatusPengguna } from './actions';
import { PenetapanRoleDialog } from './penetapan-role-dialog';
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
  const [sedangAturPeran, setSedangAturPeran] = useState<Pengguna | null>(null);
  const [konfirmasiStatus, setKonfirmasiStatus] = useState<Pengguna | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Pengguna | null>(null);
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

  /**
   * Peringatan sebelum penghapusan.
   *
   * Menyebut angkanya, bukan sekadar "data terkait". Yang menekan tombol harus
   * tahu persis berapa laporan yang akan hilang — sesudahnya tidak ada lagi
   * yang dapat mengembalikannya.
   */
  function pesanPenghapusan(target: Pengguna | null): string {
    if (!target) return '';

    const laporan = target.jumlah_laporan ?? 0;
    const lampiran = target.jumlah_lampiran ?? 0;

    if (laporan === 0 && lampiran === 0) {
      return `Akun ${target.nama} akan dihapus permanen. Akun ini belum punya laporan, `
        + 'sehingga tidak ada data laporan yang ikut hilang. Riwayat pada jejak audit tetap tersimpan.';
    }

    const bagian = [
      laporan > 0 ? `${formatAngka(laporan)} laporan` : null,
      lampiran > 0 ? `${formatAngka(lampiran)} lampiran` : null,
    ].filter(Boolean).join(' dan ');

    return `Akun ${target.nama} akan dihapus permanen beserta ${bagian} miliknya. `
      + 'Data laporan itu hilang seluruhnya dan ikut mengubah angka rekap bulan '
      + 'berjalan. Tindakan ini tidak dapat dibatalkan. '
      + 'Bila hanya ingin menghentikan aksesnya, nonaktifkan saja — laporannya tetap '
      + 'tersimpan dan namanya tetap terbaca.';
  }

  async function hapusPermanen() {
    if (!konfirmasiHapus) return;

    const hasil = await hapusPengguna(konfirmasiHapus.id);

    setKonfirmasiHapus(null);
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
            <Th>Peran</Th>
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
                  <tr
                    key={item.id}
                    /*
                     * Seluruh baris membuka penyuntingan — sasaran klik jauh
                     * lebih besar daripada ikon 28px (docs/standar-ui-ux.md
                     * §6.3). Ikon Ubah tersendiri dihapus supaya tidak ada dua
                     * jalan untuk tindakan yang sama.
                     */
                    role="button"
                    tabIndex={0}
                    onClick={() => buka(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        buka(item);
                      }
                    }}
                    aria-label={`Ubah ${item.nama}`}
                    className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    <Td className="font-medium">{item.nama}</Td>
                    <Td className="text-ink-muted">{item.email}</Td>
                    <Td className="text-ink-muted">{item.departemen.nama ?? '—'}</Td>
                    <Td className="text-ink-muted">
                      {item.role.nama ?? '—'}
                      {item.penetapan.length > 1 && (
                        <span className="ml-1 text-caption text-ink-soft">
                          +{item.penetapan.length - 1}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={item.aktif ? 'selesai' : 'belum_mulai'} />
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            // Tanpa ini, klik ikon ikut memicu klik baris.
                            event.stopPropagation();
                            setSedangAturPeran(item);
                          }}
                          aria-label={`Atur peran ${item.nama}`}
                          title="Atur peran"
                          className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                        >
                          <ShieldCheck aria-hidden="true" className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            // Tanpa ini, klik ikon ikut memicu klik baris.
                            event.stopPropagation();
                            setSedangResetSandi(item);
                          }}
                          aria-label={`Atur ulang kata sandi ${item.nama}`}
                          title="Atur ulang kata sandi"
                          className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                        >
                          <KeyRound aria-hidden="true" className="size-3.5" />
                        </button>

                        {/*
                          Akun administrator awal tidak pernah dapat dihapus —
                          tombolnya pun tidak ditawarkan.
                        */}
                        {!diriSendiri && item.dapat_dihapus && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setKonfirmasiHapus(item);
                            }}
                            aria-label={`Hapus ${item.nama}`}
                            title="Hapus permanen"
                            className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </button>
                        )}

                        {!diriSendiri && (
                          <button
                            type="button"
                            onClick={(event) => {
                            // Tanpa ini, klik ikon ikut memicu klik baris.
                            event.stopPropagation();
                            setKonfirmasiStatus(item);
                          }}
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

      <PenetapanRoleDialog
        terbuka={sedangAturPeran !== null}
        onTutup={() => setSedangAturPeran(null)}
        pengguna={sedangAturPeran}
        departemen={departemen}
        role={role}
      />

      <ResetPasswordDialog
        pengguna={sedangResetSandi}
        onTutup={() => setSedangResetSandi(null)}
      />

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        onSetuju={hapusPermanen}
        judul="Hapus Pengguna"
        pesan={pesanPenghapusan(konfirmasiHapus)}
        labelAksi="Hapus"
        berisiko
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
