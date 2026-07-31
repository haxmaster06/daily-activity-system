'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BellRing, CalendarRange } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal } from '@/lib/format';
import type { Departemen } from '@/lib/master-data';
import type { RingkasanMonitoring } from '@/lib/ringkasan-server';

interface TabelMonitoringProps {
  ringkasan: RingkasanMonitoring;
  departemen: Departemen[];
  /** Supervisor terkunci pada departemennya; filter departemen tidak berguna. */
  dapatPilihDepartemen: boolean;
  /** Dipakai untuk tidak menawarkan pengingat kepada diri sendiri. */
  penggunaId: number;
}

/**
 * Ringkasan kepatuhan pelaporan per anggota.
 *
 * Pertanyaan yang dijawab halaman ini adalah "siapa yang sudah dan belum
 * melapor", bukan "laporan apa saja yang masuk" — daftar laporan mentah ada
 * di halaman Laporan.
 */
export function TabelMonitoring({
  ringkasan,
  departemen,
  dapatPilihDepartemen,
  penggunaId,
}: TabelMonitoringProps) {
  const router = useRouter();
  const { rentang, anggota } = ringkasan;

  const [mengirim, setMengirim] = useState<number | null>(null);
  const [sudahDiingatkan, setSudahDiingatkan] = useState<number[]>([]);
  const [hasil, setHasil] = useState<{ jenis: 'galat' | 'berhasil'; pesan: string } | null>(
    null,
  );

  const totalLaporan = anggota.reduce((n, a) => n + a.jumlah_laporan, 0);
  const belumSamaSekali = anggota.filter((a) => a.jumlah_laporan === 0).length;

  async function kirimPengingat(id: number) {
    setMengirim(id);
    setHasil(null);

    try {
      const response = await fetch('/api/monitoring/pengingat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pengguna_id: id }),
      });

      const isi = (await response.json()) as { success: boolean; message: string };

      setHasil({ jenis: isi.success ? 'berhasil' : 'galat', pesan: isi.message });

      // Ditandai walau gagal karena sudah pernah dikirim hari ini — tombolnya
      // tidak berguna lagi sampai hari berganti.
      if (isi.success || response.status === 422) {
        setSudahDiingatkan((sebelumnya) => [...sebelumnya, id]);
      }
    } catch {
      setHasil({
        jenis: 'galat',
        pesan: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.',
      });
    } finally {
      setMengirim(null);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">Monitoring Tim</h1>
        <p className="flex items-center gap-1.5 text-body text-ink-muted">
          <CalendarRange aria-hidden="true" className="size-4" />
          {formatTanggal(rentang.dari)} – {formatTanggal(rentang.sampai)}
          <span className="text-ink-soft">({rentang.jumlah_hari} hari)</span>
        </p>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <RingkasanAngka label="Anggota dipantau" nilai={anggota.length} />
        <RingkasanAngka label="Total laporan" nilai={totalLaporan} />
        <RingkasanAngka
          label="Belum melapor sama sekali"
          nilai={belumSamaSekali}
          perhatian={belumSamaSekali > 0}
        />
      </div>

      {hasil && <Alert jenis={hasil.jenis} pesan={hasil.pesan} className="mb-3" />}

      <div className="card overflow-hidden">
        <FilterBar
          placeholderCari="Cari nama anggota..."
          pilihan={
            dapatPilihDepartemen
              ? [
                  {
                    kunci: 'departemen_id',
                    label: 'Departemen',
                    opsi: departemen.map((d) => ({ nilai: String(d.id), label: d.nama })),
                  },
                ]
              : []
          }
        />

        <DataTable>
          <DataTableHead>
            <Th>Nama</Th>
            <Th>Departemen</Th>
            <Th align="right">Laporan</Th>
            <Th align="right">Draf</Th>
            <Th align="right">Ditinjau</Th>
            <Th align="right">Hari Tanpa Laporan</Th>
            <Th>Tindakan</Th>
          </DataTableHead>

          <DataTableBody>
            {anggota.length === 0 ? (
              <DataTableKosong
                kolom={7}
                pesan="Tidak ada anggota yang cocok dengan penyaringan ini."
              />
            ) : (
              anggota.map((item) => (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/laporan?cari=${encodeURIComponent(item.nama)}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/laporan?cari=${encodeURIComponent(item.nama)}`);
                    }
                  }}
                  aria-label={`Lihat laporan ${item.nama}`}
                  className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  <Td className="font-medium">{item.nama}</Td>
                  <Td className="text-ink-muted">{item.departemen}</Td>
                  <Td align="right" className="tabular-nums">
                    {formatAngka(item.jumlah_laporan)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(item.jumlah_draf)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(item.jumlah_ditinjau)}
                  </Td>
                  <Td
                    align="right"
                    className={cn(
                      'tabular-nums',
                      item.hari_tanpa_laporan > 0 ? 'text-accent-text' : 'text-ink-muted',
                    )}
                  >
                    {formatAngka(item.hari_tanpa_laporan)}
                  </Td>

                  <Td>
                    {/*
                      Pengingat hanya berguna bagi yang belum melapor sama
                      sekali. Menawarkannya pada semua baris membuat kolom ini
                      penuh tombol yang tidak seharusnya ditekan.
                    */}
                    {item.jumlah_laporan === 0 && item.id !== penggunaId ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          // Baris ini dapat diklik untuk membuka laporannya.
                          event.stopPropagation();
                          void kirimPengingat(item.id);
                        }}
                        disabled={mengirim !== null || sudahDiingatkan.includes(item.id)}
                        className="btn-ghost btn-sm whitespace-nowrap"
                      >
                        <BellRing aria-hidden="true" className="size-3.5" />
                        {sudahDiingatkan.includes(item.id)
                          ? 'Sudah diingatkan'
                          : mengirim === item.id
                            ? 'Mengirim...'
                            : 'Kirim Pengingat'}
                      </button>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <p className="border-t border-line px-3 py-2 text-caption text-ink-muted">
          Menampilkan {formatAngka(anggota.length)} anggota. Klik baris untuk melihat
          laporannya.
        </p>
      </div>
    </>
  );
}

function RingkasanAngka({
  label,
  nilai,
  perhatian = false,
}: {
  label: string;
  nilai: number;
  perhatian?: boolean;
}) {
  return (
    <div className="card p-3">
      <p className="text-caption text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-heading text-[1.5rem] font-bold leading-tight tabular-nums',
          perhatian ? 'text-accent-text' : 'text-ink',
        )}
      >
        {formatAngka(nilai)}
      </p>
    </div>
  );
}
