'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCheck, FileText, Plus, Upload } from 'lucide-react';

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
import { formatTanggal } from '@/lib/format';
import { RAGAM_STATUS, type Laporan } from '@/lib/laporan';
import { hapusLaporan, tinjauMassal } from './actions';
import { ImportLaporanDialog, type PilihanTemplateImport } from './import-laporan-dialog';

interface DaftarLaporanProps {
  laporan: Laporan[];
  meta: MetaHalaman;
  /** Supervisor ke atas melihat kolom penyusun; Staff tidak perlu. */
  tampilkanPenyusun: boolean;
  judul: string;
  /** Template yang boleh dipakai import. Kosong berarti tombolnya tidak ada. */
  templateImport: PilihanTemplateImport[];
}

export function DaftarLaporan({
  laporan,
  meta,
  tampilkanPenyusun,
  judul,
  templateImport,
}: DaftarLaporanProps) {
  const router = useRouter();
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Laporan | null>(null);
  const [dialogImport, setDialogImport] = useState(false);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);
  const [terpilih, setTerpilih] = useState<Set<number>>(new Set());
  const [konfirmasiTinjau, setKonfirmasiTinjau] = useState(false);
  const [sedangTinjau, setSedangTinjau] = useState(false);

  // Laporan yang boleh ditinjau pengguna ini — milik orang lain dan sudah
  // dikirim. Penanda `dapat_ditinjau` dihitung server lewat DailyReportPolicy.
  const idDapatDitinjau = laporan.filter((l) => l.dapat_ditinjau).map((l) => l.id);
  const adaYangDapatDitinjau = idDapatDitinjau.length > 0;

  // Pilihan direset tiap kali isi daftar berubah (ganti halaman, saring, muat
  // ulang) supaya id dari halaman lama tak ikut terkirim tanpa terlihat.
  const tandaHalaman = laporan.map((l) => l.id).join(',');
  useEffect(() => {
    setTerpilih(new Set());
  }, [tandaHalaman]);

  function alihSatu(id: number) {
    setTerpilih((sebelumnya) => {
      const baru = new Set(sebelumnya);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);

      return baru;
    });
  }

  const semuaTerpilih =
    adaYangDapatDitinjau && idDapatDitinjau.every((id) => terpilih.has(id));
  const sebagianTerpilih = idDapatDitinjau.some((id) => terpilih.has(id)) && !semuaTerpilih;

  function alihSemua() {
    setTerpilih(semuaTerpilih ? new Set() : new Set(idDapatDitinjau));
  }

  async function tinjauTerpilih() {
    setSedangTinjau(true);

    const hasil = await tinjauMassal([...terpilih]);

    setSedangTinjau(false);
    setKonfirmasiTinjau(false);
    setPemberitahuan({ jenis: hasil.ditinjau > 0 ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) {
      setTerpilih(new Set());
      router.refresh();
    }
  }

  async function hapus() {
    if (!konfirmasiHapus) return;

    const hasil = await hapusLaporan(konfirmasiHapus.id);

    setKonfirmasiHapus(null);
    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  const jumlahKolom = (tampilkanPenyusun ? 6 : 5) + (adaYangDapatDitinjau ? 1 : 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">{judul}</h1>

        <div className="flex shrink-0 items-center gap-2">
          {terpilih.size > 0 && (
            <button
              type="button"
              onClick={() => setKonfirmasiTinjau(true)}
              className="btn-primary btn-sm"
            >
              <CheckCheck aria-hidden="true" className="size-4" />
              Tandai Ditinjau ({terpilih.size})
            </button>
          )}

          {templateImport.length > 0 && (
            <button
              type="button"
              onClick={() => setDialogImport(true)}
              className="btn-secondary btn-sm"
            >
              <Upload aria-hidden="true" className="size-4" />
              Import
            </button>
          )}

          <Link href="/laporan/baru" className="btn-primary btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Buat Laporan
          </Link>
        </div>
      </div>

      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      <div className="card overflow-hidden">
        <FilterBar
          placeholderCari={tampilkanPenyusun ? 'Cari nama penyusun...' : 'Cari...'}
          pilihan={[
            {
              kunci: 'status',
              label: 'Status',
              opsi: [
                { nilai: 'draf', label: 'Draf' },
                { nilai: 'dikirim', label: 'Dikirim' },
                { nilai: 'ditinjau', label: 'Ditinjau' },
              ],
            },
          ]}
        />

        <DataTable>
          <DataTableHead>
            {adaYangDapatDitinjau && (
              <Th className="w-9">
                <input
                  type="checkbox"
                  aria-label="Pilih semua laporan yang dapat ditinjau"
                  checked={semuaTerpilih}
                  ref={(el) => {
                    if (el) el.indeterminate = sebagianTerpilih;
                  }}
                  onChange={alihSemua}
                  className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                />
              </Th>
            )}
            <Th>Tanggal</Th>
            {tampilkanPenyusun && <Th>Penyusun</Th>}
            <Th>Departemen</Th>
            <Th align="right">Bagian</Th>
            <Th>Status</Th>
            <Th align="right">Aksi</Th>
          </DataTableHead>

          <DataTableBody>
            {laporan.length === 0 ? (
              <DataTableKosong
                kolom={jumlahKolom}
                pesan="Belum ada laporan yang cocok dengan penyaringan ini."
              />
            ) : (
              laporan.map((item) => (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/laporan/${item.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/laporan/${item.id}`);
                    }
                  }}
                  aria-label={`Buka laporan ${formatTanggal(item.tanggal)}`}
                  className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  {adaYangDapatDitinjau && (
                    <Td>
                      {item.dapat_ditinjau && (
                        <input
                          type="checkbox"
                          aria-label={`Pilih laporan ${formatTanggal(item.tanggal)} untuk ditinjau`}
                          checked={terpilih.has(item.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => alihSatu(item.id)}
                          className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                        />
                      )}
                    </Td>
                  )}
                  <Td className="font-medium">{formatTanggal(item.tanggal)}</Td>
                  {tampilkanPenyusun && (
                    <Td className="text-ink-muted">{item.penyusun?.nama ?? '—'}</Td>
                  )}
                  <Td className="text-ink-muted">{item.departemen?.nama ?? '—'}</Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {item.jumlah_bagian ?? 0}
                  </Td>
                  <Td>
                    <StatusBadge status={RAGAM_STATUS[item.status]} label={item.label_status} />
                  </Td>
                  <Td align="right">
                    {/*
                      `dapat_dihapus`, bukan `dapat_disunting`. Keduanya sempat
                      disatukan, sehingga tombol ini muncul di tiap laporan
                      sendiri lalu dijawab 403 begitu ditekan.
                    */}
                    {item.dapat_dihapus && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setKonfirmasiHapus(item);
                        }}
                        className="btn-ghost btn-sm"
                        aria-label={`Hapus laporan ${formatTanggal(item.tanggal)}`}
                      >
                        Hapus
                      </button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <Pagination meta={meta} satuan="laporan" />
      </div>

      {laporan.length === 0 && meta.total_data === 0 && (
        <p className="mt-3 flex items-center justify-center gap-2 text-body-lg text-ink-soft">
          <FileText aria-hidden="true" className="size-4" />
          Belum ada laporan sama sekali. Mulai dari tombol Buat Laporan di atas.
        </p>
      )}

      <ImportLaporanDialog
        terbuka={dialogImport}
        onTutup={() => setDialogImport(false)}
        template={templateImport}
        onSelesai={(pesan) => {
          setDialogImport(false);
          setPemberitahuan({ jenis: 'berhasil', pesan });
          router.refresh();
        }}
      />

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        onSetuju={hapus}
        judul="Hapus Laporan"
        pesan={`Laporan ${formatTanggal(konfirmasiHapus?.tanggal ?? null)} beserta seluruh isinya akan dihapus permanen.`}
        labelAksi="Hapus"
        berisiko
      />

      <ConfirmDialog
        terbuka={konfirmasiTinjau}
        onTutup={() => !sedangTinjau && setKonfirmasiTinjau(false)}
        onSetuju={tinjauTerpilih}
        judul="Tandai Sudah Ditinjau"
        pesan={`${terpilih.size} laporan ditandai sudah ditinjau sekaligus. Tiap penyusun diberi tahu laporannya sudah dibaca. Catatan tinjauan hanya tersedia saat meninjau satu per satu.`}
        labelAksi={sedangTinjau ? 'Menandai...' : 'Tandai Ditinjau'}
      />
    </>
  );
}
