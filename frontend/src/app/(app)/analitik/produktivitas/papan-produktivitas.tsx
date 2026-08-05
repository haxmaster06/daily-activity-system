'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import type { DataProduktivitas } from '@/lib/analitik';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';
import { GrafikProduktivitas, GrafikProduktivitasDepartemen } from '../grafik';
import { PanelGrafik } from '../panel-grafik';

/**
 * Angka di dalam laporan harian, dibaca sebagai jumlah.
 *
 * Inilah bagian yang selama ini tidak tersentuh: laporan menyimpan puluhan
 * kolom angka bersatuan — kilogram masuk dan keluar, waste, box, pouch — dan
 * seluruhnya hanya pernah dibaca satu baris pada satu waktu. Yang ingin
 * diketahui seorang eksekutif justru jumlahnya.
 *
 * Metriknya dipilih sendiri, dan pilihannya tersimpan di URL supaya tautannya
 * dapat dibagikan lengkap dengan metrik dan rentangnya.
 */
export function PapanProduktivitas({ data }: { data: DataProduktivitas }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pilihMetrik(penanda: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('metrik', penanda);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (data.metrik_tersedia.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="text-body-lg text-ink-muted">
          Belum ada kolom angka bersatuan pada template laporan mana pun.
        </p>
        <p className="mt-1 text-body text-ink-soft">
          Tambahkan satuan — misalnya kg atau box — pada kolom angka di Pengaturan → Template
          Laporan, lalu halaman ini akan mengisi sendiri.
        </p>
      </div>
    );
  }

  const isi = data.data;

  if (isi === null) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center text-body-lg text-ink-muted">
        Metrik tersebut tidak dikenal. Pilih salah satu dari daftar.
      </div>
    );
  }

  const { metrik, ringkasan } = isi;
  const desimal = metrik.desimal ? 2 : 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <section className="rounded-card border border-line bg-surface p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Select
              id="metrik-produktivitas"
              label="Angka yang dibaca"
              nilai={metrik.penanda}
              onUbah={pilihMetrik}
              opsi={data.metrik_tersedia.map((satu) => ({
                nilai: satu.penanda,
                label: `${satu.label} (${satu.satuan})`,
              }))}
              className="min-w-64"
            />

            <p className="text-caption text-ink-soft">
              Diambil dari template:{' '}
              {metrik.template.length > 0 ? metrik.template.join(', ') : '—'}
            </p>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: 'Total',
                nilai: `${formatAngka(ringkasan.total, desimal)} ${metrik.satuan}`,
                bantuan: 'Jumlah seluruh baris laporan pada rentang dan departemen terpilih.',
              },
              {
                label: 'Rata-rata per hari berisi',
                nilai: `${formatAngka(ringkasan.rata_per_hari, desimal)} ${metrik.satuan}`,
                bantuan:
                  'Dibagi jumlah hari yang benar-benar ada isinya, bukan seluruh hari pada rentang — hari libur tidak menurunkan angkanya.',
              },
              {
                label: 'Hari berisi',
                nilai: `${formatAngka(ringkasan.hari_berisi)} dari ${formatAngka(ringkasan.hari_rentang)}`,
                bantuan: 'Berapa hari pada rentang ini yang memuat angka tersebut.',
              },
              {
                label: 'Hari tertinggi',
                nilai: ringkasan.tertinggi
                  ? `${formatAngka(ringkasan.tertinggi.nilai, desimal)} ${metrik.satuan}`
                  : '—',
                bantuan: ringkasan.tertinggi
                  ? `Tercatat pada ${formatTanggal(ringkasan.tertinggi.tanggal)}.`
                  : 'Belum ada data pada rentang ini.',
              },
            ] as const
          ).map((satu) => (
            <div key={satu.label} className="rounded-card border border-line bg-surface p-3">
              <Tooltip isi={satu.bantuan}>
                <span className="cursor-help text-caption text-ink-muted underline decoration-dotted underline-offset-2">
                  {satu.label}
                </span>
              </Tooltip>
              <p className="mt-1 text-section-title tabular-nums text-ink">{satu.nilai}</p>
            </div>
          ))}
        </div>

        <PanelGrafik
          judul={`${metrik.label} per hari`}
          keterangan={`Satuan ${metrik.satuan}. ${formatTanggal(data.rentang.dari)} – ${formatTanggal(data.rentang.sampai)}.`}
          grafik={<GrafikProduktivitas data={isi.per_hari} metrik={metrik} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Tanggal</Th>
                <Th align="right">{metrik.satuan}</Th>
                <Th align="right">Baris</Th>
                <Th align="right">Pelapor</Th>
              </DataTableHead>
              <DataTableBody>
                {[...isi.per_hari]
                  .reverse()
                  .filter((satu) => satu.baris > 0)
                  .map((satu) => (
                    <tr key={satu.tanggal} className="border-b border-line last:border-0">
                      <Td>{formatTanggalRingkas(satu.tanggal)}</Td>
                      <Td align="right">{formatAngka(satu.nilai, desimal)}</Td>
                      <Td align="right">{formatAngka(satu.baris)}</Td>
                      <Td align="right">{formatAngka(satu.pelapor)}</Td>
                    </tr>
                  ))}
                {isi.per_hari.every((satu) => satu.baris === 0) && (
                  <DataTableKosong
                    kolom={4}
                    pesan="Belum ada laporan yang memuat angka ini pada rentang tersebut."
                  />
                )}
              </DataTableBody>
            </DataTable>
          }
        />

        <PanelGrafik
          judul={`${metrik.label} per departemen`}
          keterangan="Diurutkan dari yang terbesar."
          grafik={<GrafikProduktivitasDepartemen data={isi.per_departemen} metrik={metrik} />}
          tabel={
            <DataTable>
              <DataTableHead>
                <Th>Departemen</Th>
                <Th align="right">{metrik.satuan}</Th>
                <Th align="right">Baris</Th>
              </DataTableHead>
              <DataTableBody>
                {isi.per_departemen.length === 0 && (
                  <DataTableKosong kolom={3} pesan="Belum ada data pada rentang ini." />
                )}
                {isi.per_departemen.map((satu) => (
                  <tr key={satu.departemen_id} className="border-b border-line last:border-0">
                    <Td>{satu.departemen}</Td>
                    <Td align="right">{formatAngka(satu.nilai, desimal)}</Td>
                    <Td align="right">{formatAngka(satu.baris)}</Td>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          }
        />

        <section className="rounded-card border border-line bg-surface p-3">
          <h2 className="font-heading text-section-title text-ink">
            Penyumbang terbesar
          </h2>
          <p className="mt-0.5 text-body text-ink-muted">
            Dua puluh teratas menurut jumlah {metrik.label.toLowerCase()}.
          </p>

          <div className="mt-3">
            <DataTable>
              <DataTableHead>
                <Th>Nama</Th>
                <Th align="right">{metrik.satuan}</Th>
                <Th align="right">Hari melapor</Th>
                <Th align="right">Rata-rata per hari</Th>
              </DataTableHead>
              <DataTableBody>
                {isi.per_orang.length === 0 && (
                  <DataTableKosong kolom={4} pesan="Belum ada data pada rentang ini." />
                )}
                {isi.per_orang.map((satu) => (
                  <tr key={satu.pengguna_id} className="border-b border-line last:border-0">
                    <Td>{satu.nama}</Td>
                    <Td align="right">{formatAngka(satu.nilai, desimal)}</Td>
                    <Td align="right">{formatAngka(satu.hari)}</Td>
                    <Td align="right">
                      {formatAngka(satu.hari === 0 ? 0 : satu.nilai / satu.hari, desimal)}
                    </Td>
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
