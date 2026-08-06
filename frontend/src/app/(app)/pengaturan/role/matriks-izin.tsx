'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatAngka } from '@/lib/format';
import { labelJangkauan } from '@/lib/izin';
import type { RingkasanRole } from '@/lib/master-data';
import type { GrupIzin } from '@/lib/peran-server';
import { hapusPeran, simpanMatriksIzin } from './actions';
import { RoleDialog } from './role-dialog';

interface MatriksIzinProps {
  peran: RingkasanRole[];
  katalog: GrupIzin[];
  bolehKelola: boolean;
}

/** Peta peran → himpunan kunci izin. */
type Pilihan = Record<number, Set<string>>;

function dariPeran(peran: RingkasanRole[]): Pilihan {
  return Object.fromEntries(peran.map((satu) => [satu.id, new Set(satu.izin ?? [])]));
}

/**
 * Matriks hak akses: baris izin, kolom peran.
 *
 * Bentuk ini dipilih karena pertanyaan yang paling sering diajukan bukan "peran
 * ini bisa apa", melainkan "apa bedanya Supervisor dan Manager". Daftar centang
 * per peran menjawab yang pertama saja, dan menuntut membuka empat layar untuk
 * menjawab yang kedua.
 *
 * Perubahan dikumpulkan dulu, baru disimpan sekali. Menyimpan tiap centang
 * seketika berarti penjaga akses dapat menolak di tengah jalan, meninggalkan
 * sebagian perubahan tersimpan dan sebagian tidak.
 */
export function MatriksIzin({ peran, katalog, bolehKelola }: MatriksIzinProps) {
  const router = useRouter();

  const awal = useMemo(() => dariPeran(peran), [peran]);
  const [pilihan, setPilihan] = useState<Pilihan>(awal);
  const [memproses, setMemproses] = useState(false);
  const [hasil, setHasil] = useState<{ jenis: 'galat' | 'berhasil'; pesan: string } | null>(
    null,
  );

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<RingkasanRole | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<RingkasanRole | null>(null);

  const berubah = useMemo(
    () =>
      peran.filter((satu) => {
        const sekarang = pilihan[satu.id] ?? new Set<string>();
        const semula = awal[satu.id] ?? new Set<string>();

        return (
          sekarang.size !== semula.size || [...sekarang].some((k) => !semula.has(k))
        );
      }),
    [peran, pilihan, awal],
  );

  function alihkan(roleId: number, kunci: string) {
    setPilihan((sebelumnya) => {
      const berikut = new Set(sebelumnya[roleId] ?? []);

      if (berikut.has(kunci)) berikut.delete(kunci);
      else berikut.add(kunci);

      return { ...sebelumnya, [roleId]: berikut };
    });
  }

  /** Mencentang atau melepas seluruh izin satu kelompok untuk satu peran. */
  function alihkanGrup(roleId: number, grup: GrupIzin) {
    const kunci = grup.izin.map((satu) => satu.kunci);
    const sekarang = pilihan[roleId] ?? new Set<string>();
    const semuaTercentang = kunci.every((k) => sekarang.has(k));

    setPilihan((sebelumnya) => {
      const berikut = new Set(sebelumnya[roleId] ?? []);

      for (const k of kunci) {
        if (semuaTercentang) berikut.delete(k);
        else berikut.add(k);
      }

      return { ...sebelumnya, [roleId]: berikut };
    });
  }

  async function simpan() {
    setMemproses(true);
    setHasil(null);

    const jawaban = await simpanMatriksIzin(
      berubah.map((satu) => ({
        role_id: satu.id,
        izin: [...(pilihan[satu.id] ?? [])],
      })),
    );

    setMemproses(false);
    setHasil({ jenis: jawaban.berhasil ? 'berhasil' : 'galat', pesan: jawaban.pesan });

    if (jawaban.berhasil) router.refresh();
    // Gagal: pilihan di layar sengaja dibiarkan apa adanya supaya pengguna
    // dapat memperbaiki centangnya, bukan mengulang dari awal.
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
          <div className="flex items-center gap-2">
            {berubah.length > 0 && (
              <span className="text-body text-accent-text">
                {formatAngka(berubah.length)} peran belum disimpan
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSedangDiubah(null);
                setDialogTerbuka(true);
              }}
              className="btn-ghost btn-sm"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tambah Peran
            </button>

            <button
              type="button"
              onClick={() => void simpan()}
              disabled={memproses || berubah.length === 0}
              className="btn-primary btn-sm"
            >
              {memproses ? 'Menyimpan...' : 'Simpan Hak Akses'}
            </button>
          </div>
        )}
      </div>

      {hasil && <Alert jenis={hasil.jenis} pesan={hasil.pesan} className="mb-3" />}

      <div className="card overflow-hidden">
        {/* Tabel menggulir di dalam dirinya sendiri; halaman tidak pernah
            menggulir mendatar (standar §6.2). */}
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-max border-collapse text-table">
            <thead className="sticky top-0 z-20 bg-surface-muted">
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-[22rem] min-w-[16rem] max-w-[22rem] bg-surface-muted px-3 py-2 text-left text-caption font-semibold text-ink-muted"
                >
                  Hak Akses
                </th>

                {peran.map((satu) => (
                  <th
                    key={satu.id}
                    scope="col"
                    className="min-w-36 px-2 py-2 text-center align-bottom"
                  >
                    <span className="flex items-center justify-center gap-1">
                      <span className="text-caption font-semibold text-ink">{satu.nama}</span>

                      {bolehKelola && (
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger
                            aria-label={`Kelola peran ${satu.nama}`}
                            className="grid size-5 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface hover:text-ink"
                          >
                            <MoreVertical aria-hidden="true" className="size-3.5" />
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              sideOffset={4}
                              className="z-40 min-w-40 animate-masuk-halus rounded-card border border-line bg-surface p-1 shadow-modal"
                            >
                              <DropdownMenu.Item
                                onSelect={() => {
                                  setSedangDiubah(satu);
                                  setDialogTerbuka(true);
                                }}
                                className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-ink-muted outline-none data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink"
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                                Ubah Keterangan
                              </DropdownMenu.Item>

                              {/* Peran bawaan tidak dapat dihapus — slug-nya
                                  dipegang seeder dan penjaga akses. */}
                              {!satu.sistem && (
                                <DropdownMenu.Item
                                  onSelect={() => setKonfirmasiHapus(satu)}
                                  className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-danger-text outline-none data-[highlighted]:bg-danger-subtle"
                                >
                                  <Trash2 aria-hidden="true" className="size-4" />
                                  Hapus Peran
                                </DropdownMenu.Item>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      )}
                    </span>

                    <span className="mt-0.5 block text-meta font-normal text-ink-soft">
                      {satu.sistem ? 'Bawaan · ' : ''}
                      {labelJangkauan(satu.jangkauan_bawaan ?? 1)}
                    </span>
                    <span className="block text-meta font-normal text-ink-soft">
                      {formatAngka(satu.jumlah_pengguna ?? 0)} pengguna
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-line bg-surface">
              {katalog.map((grup) => (
                <Fragmen key={grup.kunci}>
                  <tr className="bg-surface-muted/50">
                    <th
                      scope="rowgroup"
                      className="sticky left-0 z-10 bg-surface-muted/50 px-3 py-1.5 text-left text-caption font-semibold text-ink-muted"
                    >
                      {grup.nama}
                    </th>

                    {peran.map((satu) => {
                      const kunci = grup.izin.map((i) => i.kunci);
                      const dipilih = pilihan[satu.id] ?? new Set<string>();
                      const jumlah = kunci.filter((k) => dipilih.has(k)).length;

                      return (
                        <td key={satu.id} className="px-2 py-1.5 text-center">
                          {bolehKelola ? (
                            <button
                              type="button"
                              onClick={() => alihkanGrup(satu.id, grup)}
                              className="rounded-control px-1.5 py-0.5 text-meta text-ink-soft transition-colors duration-fast hover:bg-surface hover:text-primary-text"
                            >
                              {jumlah === kunci.length ? 'Lepas semua' : 'Pilih semua'}
                            </button>
                          ) : (
                            <span className="text-meta text-ink-soft">
                              {jumlah}/{kunci.length}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {grup.izin.map((izin) => (
                    <tr key={izin.kunci} className="hover:bg-surface-muted/40">
                      <th
                        scope="row"
                        /*
                         * Lebarnya dipatok, bukan dibiarkan mengikuti isi.
                         * Tabel ini `min-w-max`, sehingga satu keterangan
                         * panjang saja akan menarik seluruh tabel melebar dan
                         * mendorong kolom peran keluar layar — yang tersisa
                         * hanya satu kolom yang dapat dilihat sekaligus.
                         */
                        className="sticky left-0 z-10 w-[22rem] min-w-[16rem] max-w-[22rem] bg-surface px-3 py-2 text-left font-normal"
                      >
                        {/* Yang tampil namanya, bukan kunci teknisnya. */}
                        <span className="block text-body-lg text-ink">{izin.nama}</span>
                        {izin.keterangan && (
                          <span className="block text-balance text-caption leading-4 text-ink-soft">
                            {izin.keterangan}
                          </span>
                        )}
                      </th>

                      {peran.map((satu) => (
                        <td key={satu.id} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={(pilihan[satu.id] ?? new Set()).has(izin.kunci)}
                            onChange={() => alihkan(satu.id, izin.kunci)}
                            disabled={!bolehKelola}
                            aria-label={`${izin.nama} untuk peran ${satu.nama}`}
                            className="size-4 rounded border-line text-primary focus:ring-primary disabled:cursor-not-allowed"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragmen>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-line px-3 py-2 text-caption text-ink-muted">
          Hak akses seorang pengguna adalah gabungan dari seluruh perannya.
          {bolehKelola && ' Perubahan baru berlaku setelah ditekan Simpan Hak Akses.'}
        </p>
      </div>

      <RoleDialog
        terbuka={dialogTerbuka}
        onTutup={() => setDialogTerbuka(false)}
        peran={sedangDiubah}
        daftarPeran={peran}
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

/** Pembungkus tanpa simpul DOM — `<tbody>` tidak boleh punya anak selain baris. */
function Fragmen({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
