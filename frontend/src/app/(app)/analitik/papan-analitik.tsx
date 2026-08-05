'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { persenKepatuhan, type DataAnalitik } from '@/lib/analitik';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';
import {
  GrafikBeban,
  GrafikKepatuhan,
  GrafikSebaranStatus,
  GrafikStatusDepartemen,
} from './grafik';
import { PanelGrafik } from './panel-grafik';

/**
 * Isi Executive Analytics.
 *
 * Komponen client karena Chart.js menggambar ke `<canvas>` dan hanya hidup di
 * peramban. Angkanya sendiri sudah diambil di server dan diteruskan sebagai
 * prop — tidak ada pengambilan data dari sisi ini.
 */
export function PapanAnalitik({ data }: { data: DataAnalitik }) {
  const [departemenTerpilih, setDepartemenTerpilih] = useState<string | null>(null);

  const rincian = data.status_per_departemen.find(
    (satu) => satu.departemen === departemenTerpilih,
  );

  const totalKartu = data.status_per_departemen.reduce(
    (jumlah, satu) => jumlah + satu.belum_mulai + satu.dalam_proses + satu.selesai,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <PanelGrafik
        judul="Kartu Progres per Departemen"
        keterangan="Pilih nama departemen pada tabel, atau klik batangnya, untuk membuka rincian."
        grafik={
          <GrafikStatusDepartemen
            data={data.status_per_departemen}
            onPilihDepartemen={setDepartemenTerpilih}
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
                <tr key={satu.departemen} className="border-b border-line last:border-0">
                  <Td>
                    {/*
                      Nama departemen sekaligus jalan ke rinciannya.

                      Batang grafik memang dapat diklik, tetapi kanvas tidak
                      dapat difokus papan ketik sama sekali — tanpa tombol ini,
                      rincian departemen hanya terbuka bagi pengguna tetikus.
                    */}
                    <button
                      type="button"
                      onClick={() => setDepartemenTerpilih(satu.departemen)}
                      className="rounded-control text-left text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {satu.departemen}
                    </button>
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
        judul="Kepatuhan Laporan Harian"
        keterangan={`${formatTanggal(data.rentang.dari)} – ${formatTanggal(
          data.rentang.sampai,
        )}. Jumlah yang wajib melapor memakai susunan anggota hari ini.`}
        grafik={<GrafikKepatuhan data={data.kepatuhan} />}
        tabel={
          <DataTable>
            <DataTableHead>
              <Th>Tanggal</Th>
              <Th align="right">Melapor</Th>
              <Th align="right">Wajib</Th>
              <Th align="right">Kepatuhan</Th>
            </DataTableHead>
            <DataTableBody>
              {[...data.kepatuhan].reverse().map((satu) => (
                <tr key={satu.tanggal} className="border-b border-line last:border-0">
                  <Td>{formatTanggalRingkas(satu.tanggal)}</Td>
                  <Td align="right">{formatAngka(satu.melapor)}</Td>
                  <Td align="right">{formatAngka(satu.wajib)}</Td>
                  <Td align="right">{formatAngka(persenKepatuhan(satu))}%</Td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        }
      />

      <PanelGrafik
        judul="Sebaran Status Baris Laporan"
        keterangan="Dihitung dari baris aktivitas pada laporan sepanjang rentang."
        grafik={<GrafikSebaranStatus data={data.sebaran_status_baris} />}
        tabel={
          <DataTable>
            <DataTableHead>
              <Th>Status</Th>
              <Th align="right">Jumlah</Th>
            </DataTableHead>
            <DataTableBody>
              {data.sebaran_status_baris.map((satu) => (
                <tr key={satu.status} className="border-b border-line last:border-0">
                  <Td>
                    <StatusBadge status={satu.status} />
                  </Td>
                  <Td align="right">{formatAngka(satu.jumlah)}</Td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        }
      />

      <PanelGrafik
        judul="Beban per Penanggung Jawab"
        keterangan="Lima belas teratas menurut jumlah kartu yang masih berjalan."
        grafik={<GrafikBeban data={data.beban_penanggung_jawab} />}
        tabel={
          <DataTable>
            <DataTableHead>
              <Th>Penanggung Jawab</Th>
              <Th align="right">Berjalan</Th>
              <Th align="right">Selesai</Th>
            </DataTableHead>
            <DataTableBody>
              {data.beban_penanggung_jawab.length === 0 && (
                <DataTableKosong kolom={3} pesan="Belum ada kartu progres." />
              )}
              {data.beban_penanggung_jawab.map((satu) => (
                <tr key={satu.nama} className="border-b border-line last:border-0">
                  <Td>{satu.nama}</Td>
                  <Td align="right">{formatAngka(satu.berjalan)}</Td>
                  <Td align="right">{formatAngka(satu.selesai)}</Td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        }
      />

      {/*
        Tanpa grafik, dan itu disengaja. Yang dicari pembacanya di sini adalah
        kartu mana yang telat dan milik siapa — pertanyaan yang jawabannya
        berupa nama, bukan bentuk.
      */}
      <section className="rounded-card border border-line bg-surface p-3">
        <h2 className="font-heading text-section-title text-ink">Melewati Target Selesai</h2>
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
                  <Td>{satu.penanggung_jawab}</Td>
                  <Td>
                    <StatusBadge status={satu.status} label={satu.label_status} />
                  </Td>
                  <Td>{formatTanggalRingkas(satu.target_selesai)}</Td>
                  <Td align="right">{formatAngka(satu.telat_hari)} hari</Td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </section>

      <Modal
        terbuka={rincian !== undefined}
        onTutup={() => setDepartemenTerpilih(null)}
        judul={rincian?.departemen ?? ''}
        keterangan={`${formatAngka(totalKartu)} kartu tercatat pada seluruh jangkauan Anda.`}
      >
        {rincian && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ['Belum Mulai', rincian.belum_mulai],
                  ['Dalam Proses', rincian.dalam_proses],
                  ['Selesai', rincian.selesai],
                ] as const
              ).map(([label, jumlah]) => (
                <div key={label} className="rounded-card bg-surface-muted px-2 py-3">
                  <dt className="text-caption text-ink-muted">{label}</dt>
                  <dd className="mt-1 text-page-title text-ink">{formatAngka(jumlah)}</dd>
                </div>
              ))}
            </dl>

            <Link href="/progress" className="btn-secondary btn-sm w-fit">
              Buka papan progres
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
