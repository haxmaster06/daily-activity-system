'use client';

import { useState } from 'react';
import { ArrowRight, ChevronRight, FileText, Inbox } from 'lucide-react';

import { KepalaLaporan, TampilanLaporan } from '@/components/laporan/tampilan-laporan';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip } from '@/components/ui/tooltip';
import type {
  DataDepartemen,
  KeadaanDepartemen,
  RingkasLaporan,
  SorotanAngka,
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
  // Satu departemen terbuka sekaligus — direktur menelusuri satu per satu,
  // menumpuk semua terbuka mengembalikan gulir panjang yang ingin dihindari.
  const [dibuka, setDibuka] = useState<number | null>(null);

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

  // Diurutkan menurut keaktifan: yang paling banyak melapor lebih dulu, agar
  // layar pertama menampilkan yang paling mungkin dicari direktur.
  const berisi = data.departemen
    .filter((satu) => satu.jumlah_laporan > 0)
    .sort((a, b) => b.jumlah_laporan - a.jumlah_laporan || b.jumlah_baris - a.jumlah_baris);
  const kosong = data.departemen.filter((satu) => satu.jumlah_laporan === 0);

  const totalLaporan = berisi.reduce((n, s) => n + s.jumlah_laporan, 0);
  const totalBaris = berisi.reduce((n, s) => n + s.jumlah_baris, 0);
  const jumlahDepartemen = berisi.length + kosong.length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-body text-ink-muted">
            Isi laporan {formatTanggal(data.rentang.dari)} – {formatTanggal(data.rentang.sampai)}.
            Buka satu departemen untuk membaca ringkasannya.
          </p>
          {jumlahDepartemen > 0 && (
            <p className="text-caption text-ink-soft">
              <span className="font-medium text-ink-muted">{formatAngka(berisi.length)}</span> dari{' '}
              {formatAngka(jumlahDepartemen)} departemen melapor ·{' '}
              <span className="font-medium text-ink-muted">{formatAngka(totalLaporan)}</span> laporan
              · {formatAngka(totalBaris)} baris
            </p>
          )}
        </div>

        {berisi.length === 0 && kosong.length === 0 && (
          <div className="rounded-card border border-line bg-surface p-6 text-center text-body-lg text-ink-soft">
            Tidak ada departemen pada jangkauan dan penyaringan ini.
          </div>
        )}

        {berisi.length > 0 && (
          <ul className="overflow-hidden rounded-card border border-line bg-surface">
            {berisi.map((satu) => (
              <BarisDepartemen
                key={satu.departemen_id}
                keadaan={satu}
                terbuka={dibuka === satu.departemen_id}
                onAlih={() =>
                  setDibuka((kini) => (kini === satu.departemen_id ? null : satu.departemen_id))
                }
                onBuka={buka}
              />
            ))}
          </ul>
        )}

        {kosong.length > 0 && (
          <section className="rounded-card border border-line bg-surface px-3 py-2.5">
            <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-ink-soft">
              <Inbox aria-hidden="true" className="size-3.5" />
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
    </>
  );
}

/**
 * Angka terbesar departemen — isyarat "berapa" yang paling mudah dipindai.
 *
 * Sengaja yang terbesar, bukan yang pertama: kolom pertama sebuah template
 * kerap berupa susut/waste yang nol, dan menampilkan "0 kg" sebagai kepala
 * baris membuat departemen yang sibuk tampak menganggur.
 *
 * ponytail: heuristik lintas-satuan (kg vs box vs %) — bukan perbandingan
 * bermakna antar kolom, hanya memilih figur paling menonjol untuk sekilas.
 */
function sorotanUtama(sorotan: SorotanDepartemen[]): SorotanAngka | null {
  const angka = sorotan.filter((satu): satu is SorotanAngka => satu.jenis === 'angka');

  return angka.reduce<SorotanAngka | null>(
    (besar, satu) => (besar === null || satu.total > besar.total ? satu : besar),
    null,
  );
}

function BarisDepartemen({
  keadaan,
  terbuka,
  onAlih,
  onBuka,
}: {
  keadaan: KeadaanDepartemen;
  terbuka: boolean;
  onAlih: () => void;
  onBuka: (laporan: RingkasLaporan) => void;
}) {
  const utama = sorotanUtama(keadaan.sorotan);
  const panelId = `dept-panel-${keadaan.departemen_id}`;

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onAlih}
        aria-expanded={terbuka}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast',
          'hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
          terbuka && 'bg-surface-muted/40',
        )}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-ink-soft transition-transform duration-fast',
            terbuka && 'rotate-90',
          )}
        />

        <span className="min-w-0 flex-1">
          <span className="font-heading text-body-lg font-semibold text-ink">
            {keadaan.departemen}
          </span>
          {utama && (
            <span className="ml-2 text-caption text-ink-soft">
              {utama.label}
            </span>
          )}
        </span>

        {/* Isyarat khas departemen — angka utamanya, disejajarkan ke kanan. */}
        {utama ? (
          <span className="shrink-0 text-right tabular-nums">
            <span className="text-body-lg font-semibold text-ink">
              {formatAngka(utama.total, Number.isInteger(utama.total) ? 0 : 2)}
            </span>{' '}
            <span className="text-caption font-normal text-ink-soft">{utama.satuan}</span>
          </span>
        ) : (
          <span className="shrink-0 text-caption text-ink-soft">
            {formatAngka(keadaan.sorotan.length)} ringkasan
          </span>
        )}

        <span className="hidden shrink-0 items-baseline gap-1 text-caption text-ink-soft tabular-nums sm:flex">
          <span className="font-medium text-ink-muted">{formatAngka(keadaan.jumlah_laporan)}</span>
          laporan
        </span>

        <span className="hidden w-20 shrink-0 text-right text-caption text-ink-soft sm:block">
          {keadaan.terakhir ? formatTanggalRingkas(keadaan.terakhir.tanggal) : '—'}
        </span>
      </button>

      {terbuka && (
        <div id={panelId} className="border-t border-line bg-surface-muted/20 px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <TautanDepartemen id={keadaan.departemen_id} nama={keadaan.departemen}>
              <span className="inline-flex items-center gap-1 text-body">
                Saring analitik ke {keadaan.departemen}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </TautanDepartemen>
            <p className="text-caption text-ink-soft">
              {formatAngka(keadaan.jumlah_laporan)} laporan · {formatAngka(keadaan.jumlah_baris)}{' '}
              baris
              {keadaan.terakhir && <> · terakhir {formatTanggalRingkas(keadaan.terakhir.tanggal)}</>}
            </p>
          </div>

          {keadaan.sorotan.length === 0 ? (
            <p className="text-body text-ink-soft">
              Laporannya belum memuat kolom angka, pilihan, atau daftar master yang dapat diringkas.
              Bukalah salah satu laporan di bawah untuk membaca isinya.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
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
                <p className="text-caption text-ink-soft sm:col-span-2">
                  + {formatAngka(keadaan.sorotan_tersembunyi)} kolom lain tidak ditampilkan di sini.
                  Bukalah salah satu laporan di bawah untuk membaca seluruhnya.
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
                    className="flex w-full items-center justify-between gap-2 rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
        </div>
      )}
    </li>
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
