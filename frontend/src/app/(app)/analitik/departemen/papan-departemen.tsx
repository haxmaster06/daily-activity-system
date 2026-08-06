'use client';

import { useState } from 'react';
import { FileText, Inbox } from 'lucide-react';

import { KepalaLaporan, TampilanLaporan } from '@/components/laporan/tampilan-laporan';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import type {
  DataDepartemen,
  KeadaanDepartemen,
  RingkasLaporan,
  SorotanDepartemen,
} from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';
import type { Laporan } from '@/lib/laporan';
import { RAGAM_STATUS, type StatusLaporan } from '@/lib/laporan';
import { TautanDepartemen, TautanNilai } from '../dapat-disaring';
import { ambilLaporanUntukTampilan } from './actions';

/**
 * Keadaan pekerjaan tiap departemen, dibaca dari isi laporannya sendiri.
 *
 * Halaman ini menjawab pertanyaan seorang Direktur yang membuka aplikasi pagi
 * hari: *Produksi sedang mengerjakan apa, untuk pembeli mana, berapa tonasenya?*
 * — bukan seberapa rajin timnya mengisi laporan. Yang terakhir ada di tab
 * Kepatuhan.
 *
 * Isi kartunya berbeda tiap departemen dan memang tidak diseragamkan: kolom
 * Produksi bicara kilogram dan nomor LOT, kolom Exim bicara EMKL dan dokumen.
 * Ringkasannya dibangkitkan dari template masing-masing.
 */
export function PapanDepartemen({ data }: { data: DataDepartemen }) {
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [terbuka, setTerbuka] = useState(false);

  async function buka(ringkas: RingkasLaporan) {
    setTerbuka(true);
    setMemuat(true);
    setGalat(null);
    setLaporan(null);

    const hasil = await ambilLaporanUntukTampilan(ringkas.id);
    setMemuat(false);

    if (!hasil.berhasil || !hasil.laporan) {
      setGalat(hasil.pesan || 'Laporan tidak dapat dibuka.');

      return;
    }

    setLaporan(hasil.laporan);
  }

  const berisi = data.departemen.filter((satu) => satu.jumlah_laporan > 0);
  const kosong = data.departemen.filter((satu) => satu.jumlah_laporan === 0);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-muted">
          Isi laporan {formatTanggal(data.rentang.dari)} – {formatTanggal(data.rentang.sampai)}.
          Ringkasan tiap departemen mengikuti kolom templatenya sendiri.
        </p>

        {berisi.length === 0 && kosong.length === 0 && (
          <div className="rounded-card border border-line bg-surface p-6 text-center text-body-lg text-ink-soft">
            Tidak ada departemen pada jangkauan dan penyaringan ini.
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          {berisi.map((satu) => (
            <KartuDepartemen key={satu.departemen_id} keadaan={satu} onBuka={buka} />
          ))}
        </div>

        {kosong.length > 0 && (
          <section className="rounded-card border border-line bg-surface p-3">
            <h2 className="flex items-center gap-1.5 font-heading text-section-title text-ink">
              <Inbox aria-hidden="true" className="size-4 text-ink-soft" />
              Belum ada laporan pada rentang ini
            </h2>
            <p className="mt-1 text-body text-ink-muted">
              {kosong.map((satu) => satu.departemen).join(', ')}.
            </p>
          </section>
        )}
      </div>

      <Modal
        terbuka={terbuka}
        onTutup={() => setTerbuka(false)}
        judul={laporan ? `Laporan ${formatTanggal(laporan.tanggal)}` : 'Laporan'}
        keterangan={laporan?.departemen?.nama}
        lebar="sangat-lebar"
      >
        {memuat && <p className="py-6 text-center text-body-lg text-ink-muted">Memuat laporan...</p>}

        {galat && <Alert jenis="galat" pesan={galat} />}

        {laporan && (
          <div className="flex flex-col gap-3">
            <KepalaLaporan laporan={laporan} />

            {laporan.catatan_tinjauan && (
              <p className="rounded-input border border-secondary/25 bg-secondary-subtle px-3 py-2 text-body text-secondary-text">
                <span className="font-medium">Catatan peninjau: </span>
                {laporan.catatan_tinjauan}
              </p>
            )}

            <TampilanLaporan laporan={laporan} />
          </div>
        )}
      </Modal>
    </TooltipProvider>
  );
}

function KartuDepartemen({
  keadaan,
  onBuka,
}: {
  keadaan: KeadaanDepartemen;
  onBuka: (laporan: RingkasLaporan) => void;
}) {
  return (
    <section className="flex flex-col rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-section-title text-ink">
          <TautanDepartemen id={keadaan.departemen_id} nama={keadaan.departemen} />
        </h2>
        <p className="text-caption text-ink-soft">
          {formatAngka(keadaan.jumlah_laporan)} laporan, {formatAngka(keadaan.jumlah_baris)} baris
          {keadaan.terakhir && (
            <> · terakhir {formatTanggalRingkas(keadaan.terakhir.tanggal)}</>
          )}
        </p>
      </div>

      {keadaan.sorotan.length === 0 ? (
        <p className="mt-3 text-body text-ink-soft">
          Laporannya belum memuat kolom angka, pilihan, atau daftar master yang dapat diringkas.
          Bukalah salah satu laporan di bawah untuk membaca isinya.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {keadaan.sorotan.map((satu, index) => (
            <BarisSorotan key={`${satu.label}-${index}`} sorotan={satu} />
          ))}

          {/*
            Kuota sorotan menjaga tiap jenis kolom kebagian tempat, tetapi
            pemotongannya tidak boleh sunyi: kolom yang baru ditambahkan ke
            template lalu tidak muncul membuat yang menambahkannya menyimpulkan
            fiturnya rusak — padahal ia hanya kalah kuota.
          */}
          {keadaan.sorotan_tersembunyi > 0 && (
            <p className="text-caption text-ink-soft">
              + {formatAngka(keadaan.sorotan_tersembunyi)} kolom lain tidak ditampilkan di
              sini. Bukalah salah satu laporan di bawah untuk membaca seluruhnya.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-line pt-2">
        <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-ink-soft">
          Laporan terbaru
        </p>

        <ul className="flex flex-col gap-1">
          {keadaan.laporan.map((satu) => (
            <li key={satu.id}>
              <button
                type="button"
                onClick={() => onBuka(satu)}
                className="flex w-full items-center justify-between gap-2 rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText aria-hidden="true" className="size-3.5 shrink-0 text-ink-soft" />
                  <span className="whitespace-nowrap text-ink">
                    {formatTanggalRingkas(satu.tanggal)}
                  </span>
                  <span className="min-w-0 text-ink-muted">{satu.penyusun}</span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-caption text-ink-soft">
                    {formatAngka(satu.jumlah_baris)} baris
                  </span>
                  <StatusBadge
                    status={RAGAM_STATUS[satu.status as StatusLaporan] ?? 'belum_mulai'}
                    label={satu.label_status}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BarisSorotan({ sorotan }: { sorotan: SorotanDepartemen }) {
  if (sorotan.jenis === 'angka') {
    return (
      <div className="flex items-baseline justify-between gap-3 rounded-input bg-surface-muted/60 px-2.5 py-1.5">
        <span className="text-body text-ink-muted">{sorotan.label}</span>
        <Tooltip isi={`Dijumlahkan dari ${formatAngka(sorotan.baris)} baris laporan.`}>
          <span className="cursor-help text-body-lg font-medium tabular-nums text-ink">
            {formatAngka(sorotan.total, Number.isInteger(sorotan.total) ? 0 : 2)}{' '}
            <span className="text-caption font-normal text-ink-soft">{sorotan.satuan}</span>
          </span>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="rounded-input bg-surface-muted/60 px-2.5 py-1.5">
      <p className="text-body text-ink-muted">
        {sorotan.label}
        {sorotan.jumlah_berbeda > sorotan.nilai.length && (
          <span className="ml-1 text-caption text-ink-soft">
            ({formatAngka(sorotan.jumlah_berbeda)} berbeda)
          </span>
        )}
      </p>

      {/*
        Tiap nilai menyaring seluruh halaman. Inilah tautan yang paling sering
        ditekan di sini: pertanyaan yang muncul setelah melihat nama pembeli
        pada ringkasan hampir selalu "tampilkan semua yang untuk pembeli ini".
      */}
      <ul className="mt-1 flex flex-wrap gap-1">
        {sorotan.nilai.map((satu) => (
          <li key={satu.teks}>
            <TautanNilai
              kunci={sorotan.kunci}
              saring={satu.saring}
              teks={satu.teks}
              className={cn(
                'px-1.5 py-0.5 text-caption no-underline hover:no-underline',
                sorotan.jenis === 'pilihan'
                  ? 'bg-accent-subtle text-accent-text'
                  : 'bg-primary-subtle text-primary-text',
              )}
            >
              <span className="inline-flex items-center gap-1">
                {satu.teks}
                {satu.jumlah > 1 && (
                  <span className="text-ink-soft">×{formatAngka(satu.jumlah)}</span>
                )}
              </span>
            </TautanNilai>
          </li>
        ))}
      </ul>
    </div>
  );
}
