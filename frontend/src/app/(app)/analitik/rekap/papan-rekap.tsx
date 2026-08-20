'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { Pagination, type MetaHalaman } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { TampilanLaporan } from '@/components/laporan/tampilan-laporan';
import { formatAngka, formatTanggal } from '@/lib/format';
import { RAGAM_STATUS, type Laporan } from '@/lib/laporan';
import { ambilLaporanUntukTampilan } from '../departemen/actions';

/**
 * Rekap Daily Activity seluruh departemen — isinya, bukan angkanya.
 *
 * Satu baris satu laporan, dari departemen mana pun sekaligus. Menekan sebuah
 * baris membuka rincian lengkapnya di tempat, dirender `TampilanLaporan` yang
 * sama dipakai halaman laporan — sehingga tiap laporan tampil dengan kolom
 * templatenya sendiri.
 *
 * Itu pula yang membuat halaman ini dapat menampilkan semua departemen
 * sekaligus tanpa memaksakan satu bentuk tabel: template Produksi punya 27
 * kolom dan Warehouse tiga, dan menggabungkannya jadi satu tabel akan
 * menghasilkan kolom yang tidak cocok satu sama lain (alasan yang sama sudah
 * ditulis di DataExport.php). Yang seragam hanya baris ringkasnya; rinciannya
 * dirender per laporan.
 */
export function PapanRekap({ laporan, meta }: { laporan: Laporan[]; meta: MetaHalaman }) {
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const [isi, setIsi] = useState<Record<number, Laporan | 'memuat' | 'galat'>>({});

  async function alihkan(id: number) {
    if (terbuka === id) {
      setTerbuka(null);

      return;
    }

    setTerbuka(id);

    // Sekali ambil per laporan; membuka ulang memakai yang sudah ada.
    if (isi[id] !== undefined && isi[id] !== 'galat') return;

    setIsi((s) => ({ ...s, [id]: 'memuat' }));

    const hasil = await ambilLaporanUntukTampilan(id);

    setIsi((s) => ({
      ...s,
      [id]: hasil.berhasil && hasil.laporan ? hasil.laporan : 'galat',
    }));
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-body-lg font-semibold text-ink">Rekap Daily Activity</h2>
        <p className="text-caption text-ink-soft">
          Isi laporan seluruh departemen. Tekan satu baris untuk membuka rinciannya.
        </p>
      </div>

      <DataTable>
        <DataTableHead>
          <Th>Tanggal</Th>
          <Th>Departemen</Th>
          <Th>Penyusun</Th>
          <Th align="right">Bagian</Th>
          <Th>Status</Th>
          <Th align="right">Buka</Th>
        </DataTableHead>

        <DataTableBody>
          {laporan.length === 0 ? (
            <DataTableKosong
              kolom={6}
              pesan="Belum ada laporan yang cocok dengan penyaringan ini."
            />
          ) : (
            laporan.flatMap((satu) => [
              <tr
                key={satu.id}
                role="button"
                tabIndex={0}
                onClick={() => void alihkan(satu.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void alihkan(satu.id);
                  }
                }}
                aria-expanded={terbuka === satu.id}
                aria-label={`Buka rincian laporan ${formatTanggal(satu.tanggal)}`}
                className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
              >
                <Td className="font-medium">
                  <span className="flex items-center gap-1">
                    {terbuka === satu.id ? (
                      <ChevronDown aria-hidden="true" className="size-3.5 text-ink-soft" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-3.5 text-ink-soft" />
                    )}
                    {formatTanggal(satu.tanggal)}
                  </span>
                </Td>
                <Td className="text-ink-muted">{satu.departemen?.nama ?? '—'}</Td>
                <Td className="text-ink-muted">{satu.penyusun?.nama ?? '—'}</Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatAngka(satu.jumlah_bagian ?? satu.bagian?.length ?? 0)}
                </Td>
                <Td>
                  <StatusBadge status={RAGAM_STATUS[satu.status]} label={satu.label_status} />
                </Td>
                <Td align="right">
                  {/*
                    Jalan ke halaman laporannya sendiri, untuk yang ingin
                    menyunting atau meninjau — rincian di sini hanya untuk
                    dibaca.
                  */}
                  <Link
                    href={`/laporan/${satu.id}`}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Buka halaman laporan ${formatTanggal(satu.tanggal)}`}
                    title="Buka halaman laporan"
                    className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </Link>
                </Td>
              </tr>,

              terbuka === satu.id ? (
                <tr key={`${satu.id}-rincian`}>
                  <Td colSpan={6} className="bg-surface-muted/40">
                    <Rincian isi={isi[satu.id]} />
                  </Td>
                </tr>
              ) : null,
            ])
          )}
        </DataTableBody>
      </DataTable>

      <Pagination meta={meta} satuan="laporan" />
    </section>
  );
}

/** Rincian satu laporan, dirender dengan kolom templatenya sendiri. */
function Rincian({ isi }: { isi: Laporan | 'memuat' | 'galat' | undefined }) {
  if (isi === 'memuat' || isi === undefined) {
    return <p className="py-2 text-caption text-ink-soft">Memuat rincian…</p>;
  }

  if (isi === 'galat') {
    return (
      <p className="py-2 text-caption text-danger-text">
        Rincian laporan ini tidak dapat dimuat. Tutup lalu buka lagi.
      </p>
    );
  }

  return <TampilanLaporan laporan={isi} />;
}
