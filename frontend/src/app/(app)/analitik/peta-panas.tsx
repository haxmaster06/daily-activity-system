'use client';

import { Tooltip } from '@/components/ui/tooltip';
import { warnaPetaPanas, type BarisPetaPanas } from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatTanggal, formatTanggalRingkas } from '@/lib/format';

/**
 * Peta panas kepatuhan: departemen mendatar, hari menurun ke kanan.
 *
 * Bentuk yang paling cepat dibaca seorang eksekutif — satu pandangan cukup
 * untuk menemukan baris yang memerah, tanpa membaca satu angka pun.
 *
 * **Dibuat dari `<table>` sungguhan, bukan `<div>` berwarna.** Tiap sel punya
 * teks yang terbaca pembaca layar; warnanya hanya mempercepat pembacaan bagi
 * yang melihatnya. Peta panas berbasis kanvas atau div kosong tidak dapat
 * dibaca sama sekali — masalah yang sama dengan grafik Chart.js, dan diselesaikan
 * dengan cara yang sama.
 */
export function PetaPanas({
  tanggal,
  baris,
}: {
  tanggal: string[];
  baris: BarisPetaPanas[];
}) {
  if (baris.length === 0) {
    return (
      <p className="py-6 text-center text-body text-ink-soft">
        Belum ada anggota yang wajib melapor pada penyaringan ini.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5 text-table">
        <caption className="sr-only">
          Kepatuhan pelaporan tiap departemen per hari. Tiap sel menyebutkan
          berapa anggota yang melapor pada hari itu.
        </caption>

        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-surface px-2 py-1 text-left text-caption font-semibold text-ink-muted">
              Departemen
            </th>
            {tanggal.map((satu) => (
              <th
                key={satu}
                scope="col"
                className="px-0.5 py-1 text-center text-meta font-normal text-ink-soft"
              >
                {/* Hanya tanggalnya; bulan sudah disebut judul panel. */}
                {satu.slice(8)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {baris.map((satu) => (
            <tr key={satu.departemen_id}>
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-1 text-left text-caption font-medium text-ink"
              >
                {satu.departemen}
                <span className="ml-1 text-ink-soft">({satu.anggota})</span>
              </th>

              {satu.sel.map((sel) => (
                <td key={sel.tanggal} className="p-0">
                  <Tooltip
                    isi={
                      <span>
                        <strong>{satu.departemen}</strong>
                        <br />
                        {formatTanggal(sel.tanggal)}
                        <br />
                        {sel.melapor} dari {satu.anggota} anggota melapor ({sel.persen}%)
                      </span>
                    }
                  >
                    <span
                      // Teksnya tetap ada untuk pembaca layar; warnanya hanya
                      // mempercepat pembacaan bagi yang melihatnya.
                      className={cn(
                        'grid size-5 cursor-help place-items-center rounded-[3px] text-meta',
                        warnaPetaPanas(sel.persen, satu.anggota),
                      )}
                    >
                      <span className="sr-only">
                        {formatTanggalRingkas(sel.tanggal)}: {sel.melapor} dari {satu.anggota}{' '}
                        melapor
                      </span>
                    </span>
                  </Tooltip>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-ink-soft">
        <span>Warna menurut bagian anggota yang melapor:</span>
        {[
          { label: 'Tidak ada', persen: 0 },
          { label: 'Di bawah 40%', persen: 20 },
          { label: '40–69%', persen: 50 },
          { label: '70–99%', persen: 80 },
          { label: 'Semua', persen: 100 },
        ].map((satu) => (
          <span key={satu.label} className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className={cn('size-3 rounded-[3px]', warnaPetaPanas(satu.persen, 1))}
            />
            {satu.label}
          </span>
        ))}
      </div>
    </div>
  );
}
