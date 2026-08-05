'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, CalendarRange, Check, X } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import { Popover } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { formatTanggalRingkas } from '@/lib/format';

/** Pintasan rentang yang paling sering dipakai. */
const PINTASAN = [
  { label: '7 hari terakhir', hari: 7 },
  { label: '30 hari terakhir', hari: 30 },
  { label: '90 hari terakhir', hari: 90 },
] as const;

function isoHariIni(mundur = 0): string {
  const tanggal = new Date();
  tanggal.setDate(tanggal.getDate() - mundur);

  return tanggal.toISOString().slice(0, 10);
}

/**
 * Penyaring bersama seluruh halaman Analytics.
 *
 * Dirancang **satu baris**. Bentuk sebelumnya memakai tiga baris — dua pemilih
 * tanggal, tiga tombol pintasan, lalu satu pil per departemen — dan pada dua
 * puluh departemen deretan pilnya sendiri sudah menghabiskan setengah layar
 * sebelum satu angka pun terlihat.
 *
 * Yang tampil sepanjang waktu hanya **kesimpulannya**: rentang yang berlaku dan
 * berapa departemen yang dipilih. Isiannya baru muncul saat dibutuhkan. Tombol
 * Bersihkan pun hanya ada saat ada yang perlu dibersihkan.
 *
 * Nilainya disimpan di URL, bukan di state — supaya penyaringan dapat dibagikan
 * lewat tautan, bertahan saat halaman dimuat ulang, dan ikut terbawa saat
 * berpindah tab.
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

  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');

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

  function alihkanDepartemen(id: number) {
    const berikutnya = terpilih.includes(id)
      ? terpilih.filter((satu) => satu !== id)
      : [...terpilih, id];

    terapkan((params) => {
      if (berikutnya.length === 0) params.delete('departemen');
      else params.set('departemen', berikutnya.join(','));
    });
  }

  /** Pintasan yang sedang berlaku, bila rentangnya persis salah satunya. */
  const pintasanAktif = PINTASAN.find(
    (satu) => dari === isoHariIni(satu.hari - 1) && sampai === isoHariIni(),
  );

  const ringkasRentang =
    dari === null && sampai === null
      ? '30 hari terakhir'
      : (pintasanAktif?.label ??
        `${formatTanggalRingkas(dari ?? '')} – ${formatTanggalRingkas(sampai ?? '')}`);

  const ringkasDepartemen =
    terpilih.length === 0
      ? 'Semua departemen'
      : terpilih.length === 1
        ? (departemen.find((satu) => satu.id === terpilih[0])?.nama ?? '1 departemen')
        : `${terpilih.length} departemen`;

  const adaPenyaring = dari !== null || sampai !== null || terpilih.length > 0;

  return (
    <section
      aria-label="Penyaring analitik"
      className="flex flex-wrap items-center gap-2"
    >
      <Popover
        label="Ubah rentang tanggal"
        ringkasan={ringkasRentang}
        Ikon={CalendarRange}
        aktif={dari !== null || sampai !== null}
        lebar="w-72"
      >
        <p className="field-label">Pintasan</p>
        <div className="mt-1 flex flex-col gap-1">
          {PINTASAN.map((satu) => (
            <button
              key={satu.hari}
              type="button"
              onClick={() =>
                terapkan((params) => {
                  params.set('dari', isoHariIni(satu.hari - 1));
                  params.set('sampai', isoHariIni());
                })
              }
              className={cn(
                'flex items-center justify-between rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
                pintasanAktif?.hari === satu.hari
                  ? 'bg-primary-subtle font-medium text-primary-text'
                  : 'text-ink-muted hover:bg-surface-muted',
              )}
            >
              {satu.label}
              {pintasanAktif?.hari === satu.hari && (
                <Check aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <p className="field-label">Rentang sendiri</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <DatePicker
              label="Dari"
              ukuran="sm"
              nilai={dari}
              onUbah={(nilai) =>
                terapkan((params) => {
                  if (nilai) params.set('dari', nilai);
                  else params.delete('dari');
                })
              }
            />
            <DatePicker
              label="Sampai"
              ukuran="sm"
              nilai={sampai}
              onUbah={(nilai) =>
                terapkan((params) => {
                  if (nilai) params.set('sampai', nilai);
                  else params.delete('sampai');
                })
              }
            />
          </div>

          <p className="mt-2 text-caption text-ink-soft">
            Paling panjang {batasHari} hari.
          </p>
        </div>
      </Popover>

      {/*
        Pemilih departemen hanya muncul bila memang ada yang bisa dipilih.
        Pemantau satu departemen tidak perlu ditawari pilihan yang jawabannya
        sudah pasti.
      */}
      {departemen.length > 1 && (
        <Popover
          label="Pilih departemen"
          ringkasan={ringkasDepartemen}
          Ikon={Building2}
          aktif={terpilih.length > 0}
          lebar="w-64"
        >
          <button
            type="button"
            onClick={() => terapkan((params) => params.delete('departemen'))}
            className={cn(
              'flex w-full items-center justify-between rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
              terpilih.length === 0
                ? 'bg-primary-subtle font-medium text-primary-text'
                : 'text-ink-muted hover:bg-surface-muted',
            )}
          >
            Semua departemen
            {terpilih.length === 0 && <Check aria-hidden="true" className="size-3.5" />}
          </button>

          {/*
            Daftarnya menggulir di dalam dirinya sendiri. Dua puluh departemen
            yang ditampilkan sekaligus membuat popover lebih tinggi dari layar.
          */}
          <ul className="mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t border-line pt-1">
            {departemen.map((satu) => {
              const aktif = terpilih.includes(satu.id);

              return (
                <li key={satu.id}>
                  <button
                    type="button"
                    onClick={() => alihkanDepartemen(satu.id)}
                    aria-pressed={aktif}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
                      aktif
                        ? 'bg-primary-subtle font-medium text-primary-text'
                        : 'text-ink-muted hover:bg-surface-muted',
                    )}
                  >
                    {satu.nama}
                    {aktif && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover>
      )}

      {adaPenyaring && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex h-input-sm items-center gap-1 rounded-control px-2 text-body text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
        >
          <X aria-hidden="true" className="size-3.5" />
          Bersihkan
        </button>
      )}
    </section>
  );
}
