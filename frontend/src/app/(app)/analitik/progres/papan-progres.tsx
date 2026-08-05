'use client';

import { AlertTriangle, Clock } from 'lucide-react';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import type { DataProgres } from '@/lib/analitik';
import { formatAngka, formatTanggalRingkas } from '@/lib/format';
import { TautanDepartemen, TautanPengguna, TautanStatus } from '../dapat-disaring';
import { GrafikBeban, GrafikSebaranStatus, GrafikStatusDepartemen } from '../grafik';
import { usePenyaring } from '../use-penyaring';
import { PanelGrafik } from '../panel-grafik';

/**
 * Papan progres dibaca dari sisi eksekutif.
 *
 * Bukan mengulang papan Kanban — yang ditampilkan di sini justru yang tidak
 * terlihat dari papan: kartu yang menggantung paling lama, siapa yang
 * bebannya menumpuk, dan berapa yang belum punya penanggung jawab.
 */
export function PapanProgres({ data }: { data: DataProgres }) {
  const { saringDepartemen } = usePenyaring();

  const kartuRingkas = [
    {
      label: 'Kartu berjalan',
      nilai: data.ringkasan.berjalan,
      bantuan: 'Belum ditandai selesai.',
    },
    {
      label: 'Selesai',
      nilai: data.ringkasan.selesai,
      bantuan: 'Sudah ditandai selesai pada papan progres.',
    },
    {
      label: 'Lewat target',
      nilai: data.ringkasan.telat,
      bantuan: 'Target selesainya sudah lewat dan belum rampung.',
    },
    {
      label: 'Tanpa penanggung jawab',
      nilai: data.ringkasan.tanpa_penanggung_jawab,
      bantuan: 'Pekerjaan yang belum jelas siapa yang mengerjakan.',
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kartuRingkas.map((satu) => (
            <div key={satu.label} className="rounded-card border border-line bg-surface p-3">
              <Tooltip isi={satu.bantuan}>
                <span className="cursor-help text-caption text-ink-muted underline decoration-dotted underline-offset-2">
                  {satu.label}
                </span>
              </Tooltip>
              <p className="mt-1 text-page-title tabular-nums text-ink">
                {formatAngka(satu.nilai)}
              </p>
            </div>
          ))}
        </div>

        <PanelGrafik
          judul="Kartu per departemen"
          keterangan="Klik batangnya, atau nama departemen pada tabel, untuk menyaring seluruh halaman."
          grafik={
            <GrafikStatusDepartemen
              data={data.status_per_departemen}
              onPilihDepartemen={(nama) => {
                const cocok = data.status_per_departemen.find(
                  (satu) => satu.departemen === nama,
                );

                if (cocok) saringDepartemen(cocok.departemen_id);
              }}
            />
          }
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
                      {/*
                        Batang grafik dapat diklik, tetapi kanvas tidak dapat
                        difokus papan ketik sama sekali. Tanpa tombol ini,
                        penyaringan hanya terjangkau pengguna tetikus.
                      */}
                      <TautanDepartemen id={satu.departemen_id} nama={satu.departemen} />
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

        <PanelGrafik
          judul="Sebaran status baris laporan"
          keterangan="Dari baris aktivitas pada laporan, memakai kosakata status yang sama dengan papan progres."
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
                      {/*
                        Badge status ikut menyaring. Statusnya sama persis dengan
                        status kartu progres, sehingga satu klik menyempitkan
                        kedua sumber sekaligus.
                      */}
                      <TautanStatus status={satu.status} label={satu.label}>
                        <StatusBadge status={satu.status} />
                      </TautanStatus>
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
          judul="Beban per penanggung jawab"
          keterangan="Lima belas teratas menurut kartu yang masih berjalan."
          grafik={<GrafikBeban data={data.beban_penanggung_jawab} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Penanggung Jawab</Th>
                <Th align="right">Berjalan</Th>
                <Th align="right">Selesai</Th>
                <Th align="right">Telat</Th>
              </DataTableHead>
              <DataTableBody>
                {data.beban_penanggung_jawab.length === 0 && (
                  <DataTableKosong kolom={4} pesan="Belum ada kartu progres." />
                )}
                {data.beban_penanggung_jawab.map((satu) => (
                  <tr key={satu.nama} className="border-b border-line last:border-0">
                    <Td>
                      {/*
                        Kartu tanpa penanggung jawab tidak dapat disaring —
                        ketiadaan orang bukan sebuah pilihan orang.
                      */}
                      {satu.id === null ? (
                        satu.nama
                      ) : (
                        <TautanPengguna id={satu.id} nama={satu.nama} />
                      )}
                    </Td>
                    <Td align="right">{formatAngka(satu.berjalan)}</Td>
                    <Td align="right">{formatAngka(satu.selesai)}</Td>
                    <Td align="right" className={satu.telat > 0 ? 'text-danger-text' : undefined}>
                      {formatAngka(satu.telat)}
                    </Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />

        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="flex items-center gap-1.5 font-heading text-section-title text-ink">
            <AlertTriangle aria-hidden="true" className="size-4 text-danger" />
            Melewati target selesai
          </h2>
          <p className="mt-0.5 text-body text-ink-muted">
            Kartu yang tanggal targetnya sudah lewat dan belum ditandai selesai.
          </p>

          <div className="mt-3">
            <DataTable>
              <DataTableHead>
                <Th>Tugas</Th>
                <Th>Departemen</Th>
                <Th>Penanggung Jawab</Th>
                <Th>Status</Th>
                <Th>Target</Th>
                <Th align="right">Telat</Th>
              </DataTableHead>
              <DataTableBody>
                {data.lewat_target.length === 0 && (
                  <DataTableKosong
                    kolom={6}
                    pesan="Tidak ada kartu yang melewati target selesai."
                  />
                )}
                {data.lewat_target.map((satu) => (
                  <tr key={satu.id} className="border-b border-line last:border-0">
                    <Td>{satu.judul}</Td>
                    <Td>{satu.departemen}</Td>
                    <Td>
                      {satu.penanggung_jawab_id === null ? (
                        satu.penanggung_jawab
                      ) : (
                        <TautanPengguna
                          id={satu.penanggung_jawab_id}
                          nama={satu.penanggung_jawab}
                        />
                      )}
                    </Td>
                    <Td>
                      <TautanStatus status={satu.status} label={satu.label_status}>
                        <StatusBadge status={satu.status} label={satu.label_status} />
                      </TautanStatus>
                    </Td>
                    <Td>{formatTanggalRingkas(satu.target_selesai)}</Td>
                    <Td align="right" className="font-medium text-danger-text">
                      {formatAngka(satu.telat_hari)} hari
                    </Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="flex items-center gap-1.5 font-heading text-section-title text-ink">
            <Clock aria-hidden="true" className="size-4 text-ink-soft" />
            Paling lama menggantung
          </h2>
          <p className="mt-0.5 text-body text-ink-muted">
            Kartu yang belum selesai, diurutkan dari yang paling lama dibuat. Belum tentu telat —
            sebagian memang tidak punya target.
          </p>

          <div className="mt-3">
            <DataTable>
              <DataTableHead>
                <Th>Tugas</Th>
                <Th>Departemen</Th>
                <Th>Penanggung Jawab</Th>
                <Th>Status</Th>
                <Th align="right">Umur</Th>
              </DataTableHead>
              <DataTableBody>
                {data.umur_kartu.length === 0 && (
                  <DataTableKosong kolom={5} pesan="Tidak ada kartu yang masih berjalan." />
                )}
                {data.umur_kartu.map((satu) => (
                  <tr key={satu.id} className="border-b border-line last:border-0">
                    <Td>{satu.judul}</Td>
                    <Td>{satu.departemen}</Td>
                    <Td>
                      {satu.penanggung_jawab_id === null ? (
                        satu.penanggung_jawab
                      ) : (
                        <TautanPengguna
                          id={satu.penanggung_jawab_id}
                          nama={satu.penanggung_jawab}
                        />
                      )}
                    </Td>
                    <Td>
                      <TautanStatus status={satu.status} label={satu.label_status}>
                        <StatusBadge status={satu.status} label={satu.label_status} />
                      </TautanStatus>
                    </Td>
                    <Td align="right">{formatAngka(satu.umur_hari)} hari</Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </section>

      </div>
    </TooltipProvider>
  );
}
