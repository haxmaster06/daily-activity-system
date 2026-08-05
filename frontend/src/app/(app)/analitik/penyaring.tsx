'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarRange, Check, X } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/cn';
import { formatTanggalRingkas } from '@/lib/format';

/** Pintasan rentang yang paling sering dipakai. */
const PINTASAN = [
  { label: '7 hari', hari: 7 },
  { label: '30 hari', hari: 30 },
  { label: '90 hari', hari: 90 },
] as const;

function isoHariIni(mundur = 0): string {
  const tanggal = new Date();
  tanggal.setDate(tanggal.getDate() - mundur);

  return tanggal.toISOString().slice(0, 10);
}

/**
 * Penyaring bersama seluruh halaman Analytics: rentang tanggal dan departemen.
 *
 * Nilainya disimpan di URL, bukan di state. Itu yang membuat penyaringan dapat
 * dibagikan lewat tautan, bertahan saat halaman dimuat ulang, dan ikut terbawa
 * saat berpindah tab.
 *
 * Departemen yang ditawarkan sudah dibatasi jangkauan pengguna di server;
 * backend tetap membuang yang di luar jangkauan bila diminta lewat URL.
 */
export function PenyaringAnalitik({
  departemen,
  batasHari,
}: {
  departemen: { id: number; nama: string }[];
  batasHari: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dari, setDari] = useState<string | null>(searchParams.get('dari'));
  const [sampai, setSampai] = useState<string | null>(searchParams.get('sampai'));

  useEffect(() => {
    setDari(searchParams.get('dari'));
    setSampai(searchParams.get('sampai'));
  }, [searchParams]);

  const terpilih = (searchParams.get('departemen') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number);

  function terapkan(ubah: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    ubah(params);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function pilihPintasan(hari: number) {
    terapkan((params) => {
      params.set('dari', isoHariIni(hari - 1));
      params.set('sampai', isoHariIni());
    });
  }

  function alihkanDepartemen(id: number) {
    const berikutnya = terpilih.includes(id)
      ? terpilih.filter((satu) => satu !== id)
      : [...terpilih, id];

    terapkan((params) => {
      if (berikutnya.length === 0) {
        params.delete('departemen');
      } else {
        params.set('departemen', berikutnya.join(','));
      }
    });
  }

  const adaPenyaring = dari !== null || sampai !== null || terpilih.length > 0;

  return (
    <section
      aria-label="Penyaring analitik"
      className="rounded-card border border-line bg-surface p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <DatePicker
            label="Dari"
            ukuran="sm"
            nilai={dari}
            onUbah={(nilai) => terapkan((params) => {
              if (nilai) params.set('dari', nilai);
              else params.delete('dari');
            })}
          />
          <DatePicker
            label="Sampai"
            ukuran="sm"
            nilai={sampai}
            onUbah={(nilai) => terapkan((params) => {
              if (nilai) params.set('sampai', nilai);
              else params.delete('sampai');
            })}
          />
        </div>

        <div className="flex items-center gap-1">
          {PINTASAN.map((satu) => (
            <button
              key={satu.hari}
              type="button"
              onClick={() => pilihPintasan(satu.hari)}
              className="btn-ghost btn-sm"
            >
              <CalendarRange aria-hidden="true" className="size-3.5" />
              {satu.label}
            </button>
          ))}
        </div>

        {adaPenyaring && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="btn-ghost btn-sm text-danger-text"
          >
            <X aria-hidden="true" className="size-3.5" />
            Bersihkan
          </button>
        )}
      </div>

      {/*
        Departemen ditampilkan sebagai tombol berjajar, bukan dropdown bertumpuk.
        Pilihannya sedikit dan sering diganti-ganti; dropdown menuntut dua klik
        untuk pekerjaan satu klik.
      */}
      {departemen.length > 1 && (
        <div className="mt-3">
          <span className="field-label">Departemen</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => terapkan((params) => params.delete('departemen'))}
              aria-pressed={terpilih.length === 0}
              className={cn(
                'inline-flex items-center gap-1 rounded-control border px-2 py-1 text-caption transition-colors duration-fast',
                terpilih.length === 0
                  ? 'border-primary bg-primary-subtle font-medium text-primary-text'
                  : 'border-line text-ink-muted hover:bg-surface-muted',
              )}
            >
              {terpilih.length === 0 && <Check aria-hidden="true" className="size-3" />}
              Semua
            </button>

            {departemen.map((satu) => {
              const aktif = terpilih.includes(satu.id);

              return (
                <button
                  key={satu.id}
                  type="button"
                  onClick={() => alihkanDepartemen(satu.id)}
                  aria-pressed={aktif}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-control border px-2 py-1 text-caption transition-colors duration-fast',
                    aktif
                      ? 'border-primary bg-primary-subtle font-medium text-primary-text'
                      : 'border-line text-ink-muted hover:bg-surface-muted',
                  )}
                >
                  {aktif && <Check aria-hidden="true" className="size-3" />}
                  {satu.nama}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-2 text-caption text-ink-soft">
        {dari || sampai
          ? `Menampilkan ${formatTanggalRingkas(dari ?? '')} sampai ${formatTanggalRingkas(sampai ?? '')}.`
          : 'Tanpa pilihan tanggal, yang ditampilkan 30 hari terakhir.'}{' '}
        Rentang paling panjang {batasHari} hari.
      </p>
    </section>
  );
}
