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
import { StatusBadge } from '@/components/ui/status-badge';
import { formatAngka } from '@/lib/format';
import type { Departemen } from '@/lib/master-data';
import { hapusDepartemen } from './actions';
import { DepartmentDialog } from './department-dialog';

/**
 * Daftar departemen sebagai tabel, bukan kisi kartu.
 *
 * Sembilan belas departemen berupa kartu berarti sembilan belas bingkai, ikon,
 * dan garis pemisah untuk data yang seluruhnya bertipe sama — persis yang
 * diperingatkan standarisasi §10.2 ("Avoid Card Everything"). Kartu berguna
 * ketika tiap butir punya bentuk berbeda; di sini semuanya nama, kode, jumlah
 * anggota, dan status, sehingga kolom yang sejajar jauh lebih mudah
 * dibandingkan daripada kartu yang berjajar.
 *
 * Bentuknya disamakan dengan Manajemen Pengguna: klik baris untuk menyunting,
 * ikon hapus tersendiri karena tindakannya merusak (§6.3).
 */
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

      <DataTable>
        <DataTableHead>
          <Th>Departemen</Th>
          <Th>Kode</Th>
          <Th align="right">Anggota</Th>
          <Th>Wajib Lapor</Th>
          <Th>Status</Th>
          <Th align="right">Hapus</Th>
        </DataTableHead>

        <DataTableBody>
          {departemen.length === 0 ? (
            <DataTableKosong kolom={6} pesan="Belum ada departemen." />
          ) : (
            departemen.map((item) => (
              <tr
                key={item.id}
                /*
                 * Seluruh baris membuka penyuntingan — sasaran klik jauh lebih
                 * besar daripada ikon 28px (§6.3). Ikon Ubah tersendiri tidak
                 * ada supaya tidak ada dua jalan untuk tindakan yang sama.
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
                aria-label={`Ubah departemen ${item.nama}`}
                className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
              >
                <Td className="font-medium">
                  {item.nama}
                  {item.keterangan && (
                    <span className="mt-0.5 block text-caption font-normal text-ink-soft">
                      {item.keterangan}
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-ink-muted">{item.kode}</Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatAngka(item.jumlah_anggota ?? 0)}
                </Td>
                <Td>
                  {/*
                    Ditampilkan di sini, bukan hanya di dalam dialog. Departemen
                    yang dikecualikan tidak ikut terhitung pada "Belum Melapor
                    Hari Ini" maupun pengingat — dan tanpa kolom ini, satu-satunya
                    cara mengetahuinya adalah membuka setiap departemen satu per
                    satu.
                  */}
                  <span className={item.wajib_lapor ? 'text-ink-muted' : 'text-ink-soft'}>
                    {item.wajib_lapor ? 'Ya' : 'Tidak'}
                  </span>
                </Td>
                <Td>
                  <StatusBadge
                    status={item.aktif ? 'aktif' : 'nonaktif'}
                    label={item.aktif ? 'Aktif' : 'Nonaktif'}
                  />
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setKonfirmasiHapus(item);
                    }}
                    aria-label={`Hapus departemen ${item.nama}`}
                    className="btn-ghost size-7 p-0 text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </DataTableBody>
      </DataTable>

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
