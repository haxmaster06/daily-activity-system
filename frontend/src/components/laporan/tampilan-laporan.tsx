'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/cn';
import {
  formatAngka,
  formatBulanTahun,
  formatTanggal,
  formatTanggalRingkas,
} from '@/lib/format';
import type { BagianLaporan, Laporan, NilaiBaris, NilaiSel } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';

/**
 * Laporan harian dibaca, bukan diisi.
 *
 * Halaman pengisian memakai tabel lebar karena itu bentuk tercepat untuk
 * **mengetik** berbaris-baris. Untuk **membaca** — dan itu yang dilakukan
 * Direktur, GM, dan peninjau — tabel yang sama justru menyulitkan: kolomnya
 * belasan, judulnya jauh di atas, dan nilainya harus dicocokkan sambil menggulir
 * mendatar.
 *
 * Di sini tiap baris menjadi satu kartu berisi pasangan label dan nilai,
 * dikelompokkan seperti pada templatenya. Nama kolom selalu bersebelahan dengan
 * nilainya, dan tidak ada yang perlu digulir mendatar.
 *
 * Kolom kosong **disembunyikan**. Laporan dengan lima belas kolom yang hanya
 * enam terisi akan menampilkan sembilan baris "—" yang tidak berarti apa-apa,
 * dan justru menenggelamkan yang terisi.
 */
export function TampilanLaporan({ laporan }: { laporan: Laporan }) {
  const bagian = laporan.bagian ?? [];

  if (bagian.length === 0) {
    return <p className="py-6 text-center text-body-lg text-ink-soft">Laporan ini belum punya isi.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {bagian.map((satu) => (
        <BagianTampilan key={satu.id} bagian={satu} />
      ))}
    </div>
  );
}

function BagianTampilan({ bagian }: { bagian: BagianLaporan }) {
  const kolom = [...bagian.template.kolom].sort((a, b) => a.urutan - b.urutan);

  return (
    <section>
      <h3 className="flex items-baseline gap-2 font-heading text-section-title text-ink">
        {bagian.template.nama}
        <span className="text-caption font-normal text-ink-soft">
          {formatAngka(bagian.baris.length)} baris
        </span>
      </h3>

      <div className="mt-2 flex flex-col gap-2">
        {bagian.baris.map((baris, nomor) => (
          <KartuBaris key={baris.id} nomor={nomor + 1} kolom={kolom} baris={baris.nilai} status={baris.status} />
        ))}
      </div>
    </section>
  );
}

function KartuBaris({
  nomor,
  kolom,
  baris,
  status,
}: {
  nomor: number;
  kolom: KolomTemplate[];
  baris: NilaiBaris;
  status: string | null;
}) {
  // Hanya kolom yang benar-benar terisi — lihat catatan di atas.
  const terisi = kolom.filter((satu) => berisi(baris[satu.kunci]));

  const grup = new Map<string, KolomTemplate[]>();
  for (const satu of terisi) {
    const nama = satu.grup ?? '';
    grup.set(nama, [...(grup.get(nama) ?? []), satu]);
  }

  return (
    <article className="rounded-card border border-line bg-surface-muted/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-ink-soft">Baris {nomor}</span>
        {status && <StatusBadge status={status} />}
      </div>

      {terisi.length === 0 ? (
        <p className="text-body text-ink-soft">Baris ini belum berisi apa pun.</p>
      ) : (
        [...grup.entries()].map(([namaGrup, isiGrup]) => (
          <div key={namaGrup || 'tanpa-grup'} className={cn(namaGrup && 'mt-2')}>
            {namaGrup && (
              // Nama grup ikut ditampilkan: pada template dengan kolom
              // berulang — QTY Masuk pada tahap Ayak dan pada tahap Oven —
              // labelnya sama persis dan hanya grupnya yang membedakan.
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-ink-soft">
                {namaGrup}
              </p>
            )}

            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {isiGrup.map((satu) => (
                <div
                  key={satu.kunci}
                  className={cn(
                    'flex items-baseline justify-between gap-3 border-b border-line/60 py-0.5 last:border-0',
                    // Teks panjang memakai satu baris penuh; memaksanya ke
                    // separuh lebar membuatnya terpotong-potong.
                    satu.tipe === 'textarea' && 'sm:col-span-2',
                  )}
                >
                  <dt className="shrink-0 text-caption text-ink-soft">
                    {satu.label}
                    {satu.satuan && <span className="ml-1">({satu.satuan})</span>}
                  </dt>
                  <dd
                    className={cn(
                      'min-w-0 text-right text-body-lg text-ink',
                      // `truncate` dilarang untuk isi bermakna (standar §23.2):
                      // teks panjang dibiarkan turun baris, bukan dipotong.
                      satu.tipe === 'textarea' && 'whitespace-pre-line text-left',
                    )}
                  >
                    {tampilkan(baris[satu.kunci], satu)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))
      )}
    </article>
  );
}

function berisi(nilai: NilaiSel | undefined): boolean {
  if (nilai === null || nilai === undefined || nilai === '') return false;
  if (Array.isArray(nilai)) return nilai.length > 0;

  return true;
}

/**
 * Nilai satu sel dalam bentuk yang dibaca manusia.
 *
 * Tiap tipe punya bentuk bacanya sendiri, dan menampilkan nilai mentah berarti
 * membocorkan bentuk penyimpanan ke layar — `true` alih-alih "Ya", `selesai`
 * alih-alih "Selesai", `2026-08-05` alih-alih "5 Agustus 2026".
 */
function tampilkan(nilai: NilaiSel | undefined, kolom: KolomTemplate): string {
  if (!berisi(nilai)) return '—';

  switch (kolom.tipe) {
    case 'boolean':
      return nilai === true ? 'Ya' : 'Tidak';

    case 'integer':
      return formatAngka(Number(nilai));

    case 'decimal':
      return formatAngka(Number(nilai), kolom.desimal ?? 2);

    case 'date':
      return formatTanggal(String(nilai));

    case 'month':
      return formatBulanTahun(String(nilai));

    case 'master': {
      // Salinan `{kode, nama}`. Bentuk skalar tetap mungkin muncul pada laporan
      // lama yang kolomnya dulu bertipe teks, dan laporan itu harus tetap
      // terbaca.
      if (typeof nilai === 'object' && nilai !== null && 'nama' in nilai) {
        return String(nilai.nama);
      }

      return String(nilai);
    }

    case 'select':
      return kolom.pilihan?.find((satu) => satu.nilai === nilai)?.label ?? String(nilai);

    case 'multiselect': {
      const daftar = Array.isArray(nilai) ? nilai : [nilai];

      return daftar
        .map(
          (satu) =>
            kolom.pilihan?.find((pilihan) => pilihan.nilai === satu)?.label ?? String(satu),
        )
        .join(', ');
    }

    default:
      return String(nilai);
  }
}

/** Kepala laporan: tanggal, penyusun, dan keadaannya. */
export function KepalaLaporan({ laporan }: { laporan: Laporan }) {
  const keterangan = [
    ['Penyusun', laporan.penyusun?.nama ?? '—'],
    ['Departemen', laporan.departemen?.nama ?? '—'],
    ['Tanggal', formatTanggalRingkas(laporan.tanggal)],
  ] as const;

  return (
    <dl className="grid grid-cols-3 gap-2">
      {keterangan.map(([label, nilai]) => (
        <div key={label} className="rounded-card bg-surface-muted px-2 py-1.5">
          <dt className="text-caption text-ink-soft">{label}</dt>
          <dd className="mt-0.5 text-body-lg text-ink">{nilai}</dd>
        </div>
      ))}
    </dl>
  );
}
