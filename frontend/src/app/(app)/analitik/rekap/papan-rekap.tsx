'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { formatAngka, formatTanggal } from '@/lib/format';
import type { BarisRekap, DataRekap } from '@/lib/analitik';
import type { Laporan } from '@/lib/laporan';
import { cn } from '@/lib/cn';
import { StatusBadge } from '@/components/ui/status-badge';
import { RAGAM_STATUS } from '@/lib/laporan';
import { TautanDepartemen } from '../dapat-disaring';
import { ambilLaporanDepartemen } from './actions';

/**
 * Rekap Daily Activity seluruh departemen dalam satu tabel.
 *
 * Pertanyaan yang dijawab: departemen mana yang tertinggal. Tab Departemen
 * menjawab pertanyaan lain — seperti apa pekerjaan sebuah departemen — dan
 * kartu memang tidak dapat dibandingkan kolom per kolom.
 *
 * Tabelnya berdiri sendiri tanpa grafik, jadi memakai `<section>` biasa dan
 * bukan `PanelGrafik`, yang mewajibkan pasangan grafik + tabel.
 */
export function PapanRekap({ data }: { data: DataRekap }) {
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const [isi, setIsi] = useState<Record<number, Laporan[] | 'memuat' | 'galat'>>({});

  async function alihkan(departemenId: number) {
    if (terbuka === departemenId) {
      setTerbuka(null);

      return;
    }

    setTerbuka(departemenId);

    // Sekali ambil per departemen; membuka ulang memakai yang sudah ada.
    if (isi[departemenId] !== undefined && isi[departemenId] !== 'galat') return;

    setIsi((s) => ({ ...s, [departemenId]: 'memuat' }));

    const hasil = await ambilLaporanDepartemen(
      departemenId,
      data.rentang.dari,
      data.rentang.sampai,
    );

    setIsi((s) => ({
      ...s,
      [departemenId]: hasil.berhasil && hasil.laporan ? hasil.laporan : 'galat',
    }));
  }

  const statusKunci = data.total.status.map((satu) => satu.status);

  function jumlahStatus(baris: BarisRekap | DataRekap['total'], kunci: string): number {
    return baris.status.find((satu) => satu.status === kunci)?.jumlah ?? 0;
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-body-lg font-semibold text-ink">Rekap Daily Activity</h2>
        <p className="text-caption text-ink-soft">
          {formatTanggal(data.rentang.dari)} – {formatTanggal(data.rentang.sampai)} ·{' '}
          {formatAngka(data.rentang.hari)} hari
        </p>
      </div>

      <DataTable>
        <DataTableHead
          grup={
            <>
              <Th />
              <Th colSpan={4} align="center">
                Laporan
              </Th>
              <Th colSpan={statusKunci.length + 1} align="center">
                Baris kegiatan
              </Th>
            </>
          }
        >
          <Th>Departemen</Th>
          <Th align="right">Pelapor</Th>
          <Th align="right">Masuk</Th>
          <Th align="right">Seharusnya</Th>
          <Th align="right">Patuh</Th>
          <Th align="right">Total</Th>
          {data.total.status.map((satu) => (
            <Th key={satu.status} align="right">
              {satu.label}
            </Th>
          ))}
        </DataTableHead>

        <DataTableBody>
          {data.departemen.length === 0 ? (
            <DataTableKosong
              kolom={6 + statusKunci.length}
              pesan="Belum ada laporan pada rentang ini."
            />
          ) : (
            data.departemen.map((baris) => (
              <Fragment key={baris.departemen_id}>
              <tr>
                <Td className="font-medium">
                  <button
                    type="button"
                    onClick={() => void alihkan(baris.departemen_id)}
                    aria-expanded={terbuka === baris.departemen_id}
                    className="flex items-center gap-1 text-left"
                  >
                    {terbuka === baris.departemen_id ? (
                      <ChevronDown aria-hidden="true" className="size-3.5 text-ink-soft" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-3.5 text-ink-soft" />
                    )}
                    <TautanDepartemen id={baris.departemen_id} nama={baris.departemen} />
                  </button>
                </Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatAngka(baris.anggota)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatAngka(baris.laporan)}
                </Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatAngka(baris.seharusnya)}
                </Td>
                <Td
                  align="right"
                  className={cn(
                    'tabular-nums font-medium',
                    baris.persen < 70 ? 'text-danger-text' : 'text-ink',
                  )}
                >
                  {baris.persen}%
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatAngka(baris.baris)}
                </Td>
                {statusKunci.map((kunci) => (
                  <Td key={kunci} align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(jumlahStatus(baris, kunci))}
                  </Td>
                ))}
              </tr>

              {terbuka === baris.departemen_id && (
                <tr>
                  <Td colSpan={6 + statusKunci.length} className="bg-surface-muted/50 p-0">
                    <DaftarLaporan isi={isi[baris.departemen_id]} />
                  </Td>
                </tr>
              )}
              </Fragment>
            ))
          )}
        </DataTableBody>

        {data.departemen.length > 0 && (
          <tfoot className="border-t-2 border-line bg-surface-muted font-medium">
            <tr>
              <Td>Total</Td>
              <Td align="right" className="tabular-nums">
                {formatAngka(data.total.anggota)}
              </Td>
              <Td align="right" className="tabular-nums">
                {formatAngka(data.total.laporan)}
              </Td>
              <Td align="right" className="tabular-nums">
                {formatAngka(data.total.seharusnya)}
              </Td>
              {/*
                Dihitung ulang dari jumlah, bukan rata-rata persentase tiap
                departemen — rata-rata memberi bobot sama kepada departemen
                beranggota dua dan beranggota dua puluh.
              */}
              <Td align="right" className="tabular-nums">
                {data.total.persen}%
              </Td>
              <Td align="right" className="tabular-nums">
                {formatAngka(data.total.baris)}
              </Td>
              {statusKunci.map((kunci) => (
                <Td key={kunci} align="right" className="tabular-nums">
                  {formatAngka(jumlahStatus(data.total, kunci))}
                </Td>
              ))}
            </tr>
          </tfoot>
        )}
      </DataTable>
    </section>
  );
}

/** Sepuluh laporan terbaru departemen yang sedang dibuka. */
function DaftarLaporan({ isi }: { isi: Laporan[] | 'memuat' | 'galat' | undefined }) {
  if (isi === 'memuat' || isi === undefined) {
    return <p className="px-3 py-2 text-caption text-ink-soft">Memuat laporan…</p>;
  }

  if (isi === 'galat') {
    return (
      <p className="px-3 py-2 text-caption text-danger-text">
        Laporan departemen ini tidak dapat dimuat. Coba buka lagi.
      </p>
    );
  }

  if (isi.length === 0) {
    return (
      <p className="px-3 py-2 text-caption text-ink-soft">
        Belum ada laporan pada rentang ini.
      </p>
    );
  }

  /*
   * Hanya kolom yang dimiliki SEMUA template. Kolom khas tiap departemen —
   * No. LOT, tonase, suhu oven — tidak dapat ikut ke tabel bersama, sebab
   * templatenya berbeda-beda; alasannya sama yang ditulis di DataExport.php.
   */
  return (
    <ul className="divide-y divide-line/60">
      {isi.map((satu) => (
        <li key={satu.id} className="flex items-center gap-3 px-3 py-1.5">
          <span className="w-32 shrink-0 text-caption text-ink-muted">
            {formatTanggal(satu.tanggal)}
          </span>
          <span className="min-w-0 flex-1 truncate text-body">
            {satu.penyusun?.nama ?? '—'}
          </span>
          <StatusBadge status={RAGAM_STATUS[satu.status]} label={satu.label_status} />
        </li>
      ))}
    </ul>
  );
}
