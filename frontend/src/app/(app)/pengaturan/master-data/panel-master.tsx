'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Database, Pencil, Plus, Trash2, Upload } from 'lucide-react';

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
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import type { BarisMaster, JenisMaster } from '@/lib/master-server';
import { hapusBaris, hapusJenis } from './actions';
import { BarisDialog } from './baris-dialog';
import { ImportDialog } from './import-dialog';
import { JenisDialog } from './jenis-dialog';

interface Props {
  jenis: JenisMaster[];
  terpilih: JenisMaster | null;
  isi: BarisMaster[];
  meta: MetaHalaman | null;
  pilihanInduk: { id: number; kode: string; nama: string }[];
  /** Kosong bila pengguna tidak berwenang menetapkan pengelola. */
  pilihanDepartemen?: { id: number; nama: string }[];
  /**
   * Pengguna berwenang menyusun jenis daftarnya — menambah, mengubah,
   * menghapus. Perubahan struktur, jadi hanya jangkauan korporat.
   */
  bolehKelolaJenis?: boolean;
  peringatan?: string | null;
}

/**
 * Layar Data Master: daftar jenis di kiri, isinya di kanan.
 *
 * Dua panel, bukan Tab. Jumlah daftar tumbuh mengikuti data — administrator
 * dapat menambah jenis kapan saja — dan `docs/standar-ui-ux.md` §2 melarang tab
 * untuk kelompok yang jumlahnya bertambah: tab horizontal berhenti terbaca di
 * atas sekitar tujuh item.
 */
export function PanelMaster({
  jenis,
  terpilih,
  isi,
  meta,
  pilihanInduk,
  pilihanDepartemen = [],
  bolehKelolaJenis = false,
  peringatan,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogJenis, setDialogJenis] = useState<{ terbuka: boolean; ubah: JenisMaster | null }>({
    terbuka: false,
    ubah: null,
  });
  const [dialogBaris, setDialogBaris] = useState<{ terbuka: boolean; ubah: BarisMaster | null }>({
    terbuka: false,
    ubah: null,
  });
  const [dialogImport, setDialogImport] = useState(false);
  const [konfirmasiJenis, setKonfirmasiJenis] = useState<JenisMaster | null>(null);
  const [konfirmasiBaris, setKonfirmasiBaris] = useState<BarisMaster | null>(null);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);

  function pilihJenis(slug: string) {
    // Penyaringan dan halaman ikut dikosongkan: keduanya milik daftar lama.
    router.push(`/pengaturan/master-data?jenis=${slug}`);
  }

  async function jalankan(aksi: Promise<{ berhasil: boolean; pesan: string }>) {
    const hasil = await aksi;

    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  return (
    <>
      {peringatan && <Alert jenis="galat" pesan={peringatan} className="mb-3" />}

      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
        {/* Daftar jenis */}
        <section className="rounded-card border border-line bg-surface p-2">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="text-caption font-semibold text-ink-soft">Daftar</h2>
            {bolehKelolaJenis && (
              <button
                type="button"
                onClick={() => setDialogJenis({ terbuka: true, ubah: null })}
                className="btn-ghost btn-sm gap-1 text-caption"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Baru
              </button>
            )}
          </div>

          {jenis.length === 0 ? (
            <p className="px-1 py-3 text-caption text-ink-soft">
              Belum ada daftar master. Buat daftar pertama untuk mulai mengisinya.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {jenis.map((satu) => {
                const aktif = satu.slug === terpilih?.slug;

                return (
                  <li key={satu.id}>
                    <div
                      className={cn(
                        'group flex items-center gap-1 rounded-control px-2 py-1.5',
                        aktif ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-muted',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => pilihJenis(satu.slug)}
                        // min-w-0 supaya nama panjang menyusut, bukan menjebol
                        // kartunya (§6.5).
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-body"
                      >
                        <Database aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1">{satu.nama}</span>
                        <span className="shrink-0 text-caption text-ink-soft">
                          {formatAngka(satu.jumlah_isi ?? 0)}
                        </span>
                      </button>

                      {/*
                        Ubah dan hapus tersedia untuk semua daftar.

                        Sebelumnya keduanya disembunyikan pada daftar bertanda
                        bawaan sistem — dan seluruh daftar bawaan bertanda itu,
                        sehingga tidak ada satu pun yang dapat dikelola. Tanda
                        itu hanya menyatakan daftarnya dibuat seeder; yang
                        benar-benar menahan penghapusan adalah kolom template
                        yang masih merujuknya, dan server menolaknya dengan
                        kalimat yang menyebutkan berapa kolom penahannya.
                      */}
                      <span className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        {bolehKelolaJenis && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDialogJenis({ terbuka: true, ubah: satu })}
                              aria-label={`Ubah daftar ${satu.nama}`}
                              className="btn-ghost size-7 p-0"
                            >
                              <Pencil aria-hidden="true" className="size-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setKonfirmasiJenis(satu)}
                              aria-label={`Hapus daftar ${satu.nama}`}
                              className="btn-ghost size-7 p-0 text-danger"
                            >
                              <Trash2 aria-hidden="true" className="size-3" />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Isi daftar terpilih */}
        <section className="min-w-0">
          {terpilih === null ? (
            <div className="rounded-card border border-line bg-surface p-6 text-center text-body text-ink-soft">
              Pilih atau buat daftar terlebih dahulu.
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-section-title text-ink">{terpilih.nama}</h2>
                  {terpilih.induk && (
                    <p className="text-caption text-ink-soft">
                      Setiap data menunjuk satu {terpilih.induk.nama}.
                    </p>
                  )}
                </div>

                {/*
                  Tombol hanya tampil pada daftar yang memang boleh dikelola
                  pengguna ini. Menampilkannya pada daftar milik departemen lain
                  berarti mengundang orang menekan sesuatu yang pasti ditolak
                  server — dan penolakan yang dapat diramalkan lebih baik
                  dicegah di layar daripada dijelaskan sesudahnya.
                */}
                {terpilih.boleh_kelola_isi ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDialogImport(true)}
                      className="btn-secondary btn-sm"
                    >
                      <Upload aria-hidden="true" className="size-4" />
                      Import
                    </button>

                    <button
                      type="button"
                      onClick={() => setDialogBaris({ terbuka: true, ubah: null })}
                      className="btn-primary btn-sm"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Tambah Data
                    </button>
                  </div>
                ) : (
                  <p className="shrink-0 text-caption text-ink-soft">
                    Dikelola{' '}
                    {(terpilih.departemen_pengelola ?? []).map((satu) => satu.nama).join(', ') ||
                      'departemen lain'}
                  </p>
                )}
              </div>

              <FilterBar
                key={terpilih.slug}
                placeholderCari={`Cari ${terpilih.nama.toLowerCase()}...`}
              />

              <DataTable>
                {/* `DataTableHead` sudah merender <tr>-nya sendiri. */}
                <DataTableHead>
                  <Th>Nama</Th>
                  <Th>Kode</Th>
                  {terpilih.induk && <Th>{terpilih.induk.nama}</Th>}
                  <Th>Keterangan</Th>
                  <Th>Status</Th>
                  <Th className="w-10" />
                </DataTableHead>

                <DataTableBody>
                  {isi.length === 0 ? (
                    <DataTableKosong
                      kolom={terpilih.induk ? 6 : 5}
                      pesan={
                        searchParams.get('cari')
                          ? 'Tidak ada data yang cocok dengan pencarian Anda.'
                          : `Daftar ${terpilih.nama} masih kosong. Tambahkan data pertamanya.`
                      }
                    />
                  ) : (
                    isi.map((baris) => (
                      // Klik baris membuka penyuntingan (§6.3); ikon hapus
                      // tetap ikon karena tindakannya merusak.
                      <tr
                        key={baris.id}
                        {...(terpilih.boleh_kelola_isi
                          ? {
                              role: 'button',
                              tabIndex: 0,
                              'aria-label': `Ubah ${baris.nama}`,
                              onClick: () => setDialogBaris({ terbuka: true, ubah: baris }),
                              onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setDialogBaris({ terbuka: true, ubah: baris });
                                }
                              },
                            }
                          : {})}
                        className={cn(
                          terpilih.boleh_kelola_isi && 'cursor-pointer hover:bg-surface-muted',
                        )}
                      >
                        <Td>{baris.nama}</Td>
                        <Td className="font-mono text-ink-muted">{baris.kode}</Td>
                        {terpilih.induk && <Td>{baris.induk?.nama ?? '—'}</Td>}
                        <Td>{baris.keterangan ?? '—'}</Td>
                        <Td>
                          <StatusBadge
                            status={baris.aktif ? 'aktif' : 'nonaktif'}
                            label={baris.aktif ? 'Aktif' : 'Nonaktif'}
                          />
                        </Td>
                        <Td>
                          {terpilih.boleh_kelola_isi && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setKonfirmasiBaris(baris);
                              }}
                              aria-label={`Hapus ${baris.nama}`}
                              className="btn-ghost size-7 p-0 text-danger"
                            >
                              <Trash2 aria-hidden="true" className="size-3.5" />
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </DataTableBody>
              </DataTable>

              {meta && <Pagination meta={meta} satuan={terpilih.nama.toLowerCase()} />}
            </>
          )}
        </section>
      </div>

      <JenisDialog
        terbuka={dialogJenis.terbuka}
        onTutup={() => setDialogJenis({ terbuka: false, ubah: null })}
        jenis={dialogJenis.ubah}
        pilihanInduk={jenis}
        pilihanDepartemen={pilihanDepartemen}
        onSelesai={(pesan) => {
          setDialogJenis({ terbuka: false, ubah: null });
          setPemberitahuan({ jenis: 'berhasil', pesan });
          router.refresh();
        }}
      />

      {terpilih && (
        <BarisDialog
          terbuka={dialogBaris.terbuka}
          onTutup={() => setDialogBaris({ terbuka: false, ubah: null })}
          jenis={terpilih}
          baris={dialogBaris.ubah}
          pilihanInduk={pilihanInduk}
          onSelesai={(pesan) => {
            setDialogBaris({ terbuka: false, ubah: null });
            setPemberitahuan({ jenis: 'berhasil', pesan });
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        terbuka={konfirmasiJenis !== null}
        onTutup={() => setKonfirmasiJenis(null)}
        judul="Hapus daftar ini?"
        pesan={
          konfirmasiJenis
            ? `Daftar ${konfirmasiJenis.nama} beserta ${formatAngka(
                konfirmasiJenis.jumlah_isi ?? 0,
              )} datanya akan dihapus permanen. Laporan yang sudah tercatat tidak berubah — laporan menyimpan salinan namanya sendiri.`
            : ''
        }
        labelAksi="Hapus"
        berisiko
        onSetuju={async () => {
          if (!konfirmasiJenis) return;
          const target = konfirmasiJenis;
          setKonfirmasiJenis(null);
          await jalankan(hapusJenis(target.slug));
        }}
      />

      {terpilih && (
        <ImportDialog
          terbuka={dialogImport}
          onTutup={() => setDialogImport(false)}
          jenis={terpilih}
          onSelesai={(pesan) => {
            setDialogImport(false);
            setPemberitahuan({ jenis: 'berhasil', pesan });
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        terbuka={konfirmasiBaris !== null}
        onTutup={() => setKonfirmasiBaris(null)}
        judul="Hapus data ini?"
        pesan={
          konfirmasiBaris
            ? `${konfirmasiBaris.nama} akan dihapus dari daftar. Laporan yang sudah memakainya tidak berubah.`
            : ''
        }
        labelAksi="Hapus"
        berisiko
        onSetuju={async () => {
          if (!konfirmasiBaris || !terpilih) return;
          const target = konfirmasiBaris;
          setKonfirmasiBaris(null);
          await jalankan(hapusBaris(terpilih.slug, target.id));
        }}
      />
    </>
  );
}
