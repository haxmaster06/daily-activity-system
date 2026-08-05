'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { BarisKepatuhanOrang, DataKepatuhan } from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';
import { GrafikJamKirim, GrafikKepatuhanDepartemen } from '../grafik';
import { PanelGrafik } from '../panel-grafik';
import { PetaPanas } from '../peta-panas';

/** Ambang hari berturut-turut yang dianggap perlu ditindaklanjuti. */
const AMBANG_BOLONG = 3;

/**
 * Kepatuhan pelaporan: departemen mana yang tertinggal, dan siapa saja.
 *
 * Yang dicari pembacanya di sini bukan angka rata-rata melainkan **nama** —
 * karena itu tiap grafik berpasangan dengan tabel berisi orangnya, dan baris
 * yang perlu ditindaklanjuti diberi penanda beserta teksnya, bukan warna saja.
 */
export function PapanKepatuhan({ data }: { data: DataKepatuhan }) {
  const [dibuka, setDibuka] = useState<BarisKepatuhanOrang | null>(null);

  const perlu = data.per_orang.filter((satu) => satu.bolong_beruntun >= AMBANG_BOLONG);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="font-heading text-section-title text-ink">
            Peta kepatuhan per hari
          </h2>
          <p className="mt-0.5 text-body text-ink-muted">
            {formatTanggal(data.rentang.dari)} – {formatTanggal(data.rentang.sampai)}. Arahkan
            kursor ke satu kotak untuk melihat angkanya.
          </p>

          <div className="mt-3">
            <PetaPanas tanggal={data.peta_panas.tanggal} baris={data.peta_panas.baris} />
          </div>
        </section>

        <PanelGrafik
          judul="Kepatuhan per departemen"
          keterangan="Merah di bawah 50%, jingga di bawah 80%."
          grafik={<GrafikKepatuhanDepartemen data={data.per_departemen} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Departemen</Th>
                <Th align="right">Anggota</Th>
                <Th align="right">Laporan</Th>
                <Th align="right">Kepatuhan</Th>
              </DataTableHead>
              <DataTableBody>
                {data.per_departemen.length === 0 && (
                  <DataTableKosong kolom={4} pesan="Tidak ada anggota pada penyaringan ini." />
                )}
                {data.per_departemen.map((satu) => (
                  <tr key={satu.departemen_id} className="border-b border-line last:border-0">
                    <Td>{satu.departemen}</Td>
                    <Td align="right">{formatAngka(satu.anggota)}</Td>
                    <Td align="right">
                      {formatAngka(satu.laporan)}
                      <span className="text-ink-soft"> / {formatAngka(satu.seharusnya)}</span>
                    </Td>
                    <Td align="right" className={cn(satu.persen < 50 && 'font-medium text-danger-text')}>
                      {formatAngka(satu.persen)}%
                    </Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />

        <PanelGrafik
          judul="Jam pengiriman laporan"
          keterangan="Menjawab yang tidak dijawab angka kepatuhan: tim melapor jam berapa. Batang abu-abu berarti di luar jam 07.00–18.00."
          grafik={<GrafikJamKirim data={data.jam_kirim} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Jam</Th>
                <Th align="right">Laporan dikirim</Th>
              </DataTableHead>
              <DataTableBody>
                {data.jam_kirim
                  .filter((satu) => satu.jumlah > 0)
                  .map((satu) => (
                    <tr key={satu.jam} className="border-b border-line last:border-0">
                      <Td>{String(satu.jam).padStart(2, '0')}.00 WIB</Td>
                      <Td align="right">{formatAngka(satu.jumlah)}</Td>
                    </tr>
                  ))}
                {data.jam_kirim.every((satu) => satu.jumlah === 0) && (
                  <DataTableKosong
                    kolom={2}
                    pesan="Belum ada laporan yang dikirim pada rentang ini."
                  />
                )}
              </DataTableBody>
            </DataTable>
          }
        />

        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="font-heading text-section-title text-ink">Kepatuhan per orang</h2>
          <p className="mt-0.5 text-body text-ink-muted">
            Diurutkan menurut hari berturut-turut yang terlewat.{' '}
            {perlu.length > 0
              ? `${perlu.length} orang tidak mengisi ${AMBANG_BOLONG} hari atau lebih berturut-turut.`
              : 'Tidak ada yang terlewat tiga hari berturut-turut.'}
          </p>

          <div className="mt-3">
            <DataTable>
              <DataTableHead>
                <Th>Nama</Th>
                <Th>Departemen</Th>
                <Th align="right">Laporan</Th>
                <Th align="right">Kepatuhan</Th>
                <Th>Terakhir mengisi</Th>
                <Th align="right">Terlewat berturut</Th>
              </DataTableHead>
              <DataTableBody>
                {data.per_orang.length === 0 && (
                  <DataTableKosong kolom={6} pesan="Tidak ada anggota pada penyaringan ini." />
                )}
                {data.per_orang.map((satu) => (
                  <tr
                    key={satu.id}
                    className={cn(
                      'border-b border-line last:border-0',
                      satu.bolong_beruntun >= AMBANG_BOLONG && 'bg-danger-subtle/40',
                    )}
                  >
                    <Td>
                      <button
                        type="button"
                        onClick={() => setDibuka(satu)}
                        className="rounded-control text-left text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {satu.nama}
                      </button>
                    </Td>
                    <Td>{satu.departemen}</Td>
                    <Td align="right">
                      {formatAngka(satu.laporan)}
                      <span className="text-ink-soft"> / {formatAngka(satu.seharusnya)}</span>
                    </Td>
                    <Td align="right">{formatAngka(satu.persen)}%</Td>
                    <Td>{satu.terakhir ? formatTanggalRingkas(satu.terakhir) : 'Belum pernah'}</Td>
                    <Td align="right">
                      {satu.bolong_beruntun >= AMBANG_BOLONG ? (
                        // Penanda selalu disertai teks dan ikon, bukan warna
                        // saja (standar §9).
                        <span className="inline-flex items-center gap-1 font-medium text-danger-text">
                          <AlertTriangle aria-hidden="true" className="size-3.5" />
                          {formatAngka(satu.bolong_beruntun)} hari
                        </span>
                      ) : (
                        `${formatAngka(satu.bolong_beruntun)} hari`
                      )}
                    </Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </section>

        <Modal
          terbuka={dibuka !== null}
          onTutup={() => setDibuka(null)}
          judul={dibuka?.nama ?? ''}
          keterangan={dibuka?.departemen}
        >
          {dibuka && (
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ['Laporan terisi', `${formatAngka(dibuka.laporan)} dari ${formatAngka(dibuka.seharusnya)}`],
                  ['Kepatuhan', `${formatAngka(dibuka.persen)}%`],
                  [
                    'Terakhir mengisi',
                    dibuka.terakhir ? formatTanggal(dibuka.terakhir) : 'Belum pernah',
                  ],
                  ['Terlewat berturut-turut', `${formatAngka(dibuka.bolong_beruntun)} hari`],
                ] as const
              ).map(([label, nilai]) => (
                <div key={label} className="rounded-card bg-surface-muted px-2 py-2">
                  <dt className="text-caption text-ink-muted">{label}</dt>
                  <dd className="mt-0.5 text-body-lg text-ink">{nilai}</dd>
                </div>
              ))}
            </dl>
          )}
        </Modal>
      </div>
    </TooltipProvider>
  );
}
