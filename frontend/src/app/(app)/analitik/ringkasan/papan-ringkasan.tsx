'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { DataRingkasan } from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';
import { GrafikSebaranStatus, GrafikStatusDepartemen, GrafikTrenKepatuhan } from '../grafik';
import { KartuAngka } from '../kartu-kpi';
import { PanelGrafik } from '../panel-grafik';

/**
 * Halaman pertama Executive Analytics: yang perlu diketahui dalam sepuluh detik.
 *
 * Urutannya disengaja — angka utama, lalu kalimat yang menunjuk apa yang perlu
 * ditindaklanjuti, baru grafiknya. Yang membaca halaman ini biasanya tidak
 * punya waktu menafsirkan grafik, dan bagian **Perlu perhatian** menjawab
 * pertanyaannya tanpa satu pun grafik dibaca.
 */
export function PapanRingkasan({ data }: { data: DataRingkasan }) {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.kartu.map((satu) => (
            <KartuAngka key={satu.kunci} kartu={satu} />
          ))}
        </div>

        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="font-heading text-section-title text-ink">Perlu perhatian</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {data.sorotan.map((satu, index) => (
              <li
                key={index}
                className={cn(
                  'flex items-start gap-2 rounded-input px-2.5 py-1.5 text-body-lg',
                  satu.jenis === 'baik'
                    ? 'bg-secondary-subtle text-secondary-text'
                    : 'bg-accent-subtle text-accent-text',
                )}
              >
                {satu.jenis === 'baik' ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                )}
                {satu.teks}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-caption text-ink-soft">
            Rincian tiap butir ada di tab Kepatuhan dan Progres.
          </p>
        </section>

        <PanelGrafik
          judul="Tren kepatuhan"
          keterangan={`${formatTanggal(data.rentang.dari)} – ${formatTanggal(data.rentang.sampai)}. Titik abu-abu menandai akhir pekan.`}
          grafik={<GrafikTrenKepatuhan data={data.tren_kepatuhan} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Tanggal</Th>
                <Th align="right">Melapor</Th>
                <Th align="right">Wajib</Th>
                <Th align="right">Kepatuhan</Th>
              </DataTableHead>
              <DataTableBody>
                {[...data.tren_kepatuhan].reverse().map((satu) => (
                  <tr
                    key={satu.tanggal}
                    className={cn(
                      'border-b border-line last:border-0',
                      satu.akhir_pekan && 'text-ink-soft',
                    )}
                  >
                    <Td>
                      {formatTanggalRingkas(satu.tanggal)}
                      {satu.akhir_pekan && (
                        <span className="ml-1 text-caption">(akhir pekan)</span>
                      )}
                    </Td>
                    <Td align="right">{formatAngka(satu.melapor)}</Td>
                    <Td align="right">{formatAngka(satu.wajib)}</Td>
                    <Td align="right">{formatAngka(satu.persen)}%</Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />

        <PanelGrafik
          judul="Sebaran status baris laporan"
          keterangan="Dihitung dari baris aktivitas pada laporan sepanjang rentang."
          grafik={<GrafikSebaranStatus data={data.sebaran_status_baris} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Status</Th>
                <Th align="right">Jumlah</Th>
                <Th align="right">Bagian</Th>
              </DataTableHead>
              <DataTableBody>
                {data.sebaran_status_baris.map((satu) => (
                  <tr key={satu.status} className="border-b border-line last:border-0">
                    <Td>
                      <StatusBadge status={satu.status} />
                    </Td>
                    <Td align="right">{formatAngka(satu.jumlah)}</Td>
                    <Td align="right">{formatAngka(satu.persen)}%</Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />

        <PanelGrafik
          judul="Kartu progres per departemen"
          keterangan="Rinciannya, beserta yang lewat target, ada di tab Progres."
          grafik={<GrafikStatusDepartemen data={data.status_per_departemen} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Departemen</Th>
                <Th align="right">Belum Mulai</Th>
                <Th align="right">Dalam Proses</Th>
                <Th align="right">Selesai</Th>
              </DataTableHead>
              <DataTableBody>
                {data.status_per_departemen.length === 0 && (
                  <DataTableKosong kolom={4} pesan="Belum ada kartu progres." />
                )}
                {data.status_per_departemen.map((satu) => (
                  <tr key={satu.departemen_id} className="border-b border-line last:border-0">
                    <Td>
                      <Link
                        href={`/progress?departemen_id=${satu.departemen_id}`}
                        className="rounded-control text-primary-text underline-offset-4 hover:underline"
                      >
                        {satu.departemen}
                      </Link>
                    </Td>
                    <Td align="right">{formatAngka(satu.belum_mulai)}</Td>
                    <Td align="right">{formatAngka(satu.dalam_proses)}</Td>
                    <Td align="right">{formatAngka(satu.selesai)}</Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />
      </div>
    </TooltipProvider>
  );
}
