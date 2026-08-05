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
 * ## Kepadatan adalah tujuannya, bukan efek samping
 *
 * Skala hurufnya sengaja kecil: label 11px, nilai 13px. Satu baris laporan
 * Proses Harian per LOT punya dua puluh tujuh kolom — pada skala yang lebih
 * besar, satu baris saja sudah melebihi tinggi layar dan pembacanya kehilangan
 * kemampuan membandingkan antar baris, yaitu satu-satunya alasan ia membuka
 * halaman ini.
 *
 * Kolom kosong **disembunyikan** dengan alasan yang sama. Laporan dengan lima
 * belas kolom yang hanya enam terisi akan menampilkan sembilan baris "—" yang
 * tidak berarti apa-apa, dan justru menenggelamkan yang terisi.
 */
export function TampilanLaporan({ laporan }: { laporan: Laporan }) {
  const bagian = laporan.bagian ?? [];

  if (bagian.length === 0) {
    return (
      <p className="py-6 text-center text-body text-ink-soft">Laporan ini belum punya isi.</p>
    );
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
      <h3 className="sticky top-0 z-10 -mx-0.5 flex items-baseline gap-2 bg-surface/95 py-1 backdrop-blur">
        <span className="font-heading text-body-lg font-semibold text-ink">
          {bagian.template.nama}
        </span>
        <span className="text-caption font-normal text-ink-soft">
          {formatAngka(bagian.baris.length)} baris
        </span>
      </h3>

      <div className="mt-1 flex flex-col gap-1.5">
        {bagian.baris.map((baris, nomor) => (
          <KartuBaris
            key={baris.id}
            nomor={nomor + 1}
            kolom={kolom}
            baris={baris.nilai}
            status={baris.status}
          />
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
    <article className="overflow-hidden rounded-card border border-line">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted/70 px-2.5 py-1">
        <span className="text-caption font-semibold text-ink-muted">Baris {nomor}</span>
        {status && <StatusBadge status={status} />}
      </header>

      {terisi.length === 0 ? (
        <p className="px-2.5 py-2 text-body text-ink-soft">Baris ini belum berisi apa pun.</p>
      ) : (
        <div className="divide-y divide-line/60">
          {[...grup.entries()].map(([namaGrup, isiGrup]) => (
            <div key={namaGrup || 'tanpa-grup'} className="px-2.5 py-1.5">
              {namaGrup && (
                /*
                 * Nama grup ikut ditampilkan: pada template dengan kolom
                 * berulang — QTY Masuk pada tahap Oven dan pada tahap Ayak —
                 * labelnya sama persis dan hanya grupnya yang membedakan.
                 */
                <p className="mb-1 text-meta font-semibold uppercase tracking-wide text-primary-text">
                  {namaGrup}
                </p>
              )}

              <dl
                className={cn(
                  'grid gap-x-4 gap-y-0.5',
                  // Rapat pada layar lebar, satu kolom pada layar sempit —
                  // label dan nilainya harus tetap bersebelahan.
                  'sm:grid-cols-2 xl:grid-cols-3',
                )}
              >
                {isiGrup.map((satu) => (
                  <div
                    key={satu.kunci}
                    className={cn(
                      'flex items-baseline justify-between gap-2 py-0.5',
                      // Teks panjang memakai satu baris penuh; memaksanya ke
                      // sepertiga lebar membuatnya terpotong-potong.
                      satu.tipe === 'textarea' && 'sm:col-span-2 xl:col-span-3',
                    )}
                  >
                    <dt className="shrink-0 text-caption leading-5 text-ink-soft">
                      {satu.label}
                      {satu.satuan && <span className="ml-0.5">({satu.satuan})</span>}
                    </dt>
                    <dd
                      className={cn(
                        'min-w-0 text-right text-body leading-5 text-ink',
                        // Angka disejajarkan supaya mudah dibandingkan antar baris.
                        (satu.tipe === 'integer' || satu.tipe === 'decimal') &&
                          'font-medium tabular-nums',
                        // `truncate` dilarang untuk isi bermakna (standar §23.2):
                        // teks panjang turun baris, bukan dipotong.
                        satu.tipe === 'textarea' && 'whitespace-pre-line text-left',
                      )}
                    >
                      {tampilkan(baris[satu.kunci], satu)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
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

/** Kepala laporan: tanggal, penyusun, dan departemennya. */
export function KepalaLaporan({ laporan }: { laporan: Laporan }) {
  const keterangan = [
    ['Penyusun', laporan.penyusun?.nama ?? '—'],
    ['Departemen', laporan.departemen?.nama ?? '—'],
    ['Tanggal', formatTanggalRingkas(laporan.tanggal)],
  ] as const;

  return (
    <dl className="grid grid-cols-3 gap-1.5">
      {keterangan.map(([label, nilai]) => (
        <div key={label} className="rounded-input bg-surface-muted px-2 py-1">
          <dt className="text-meta uppercase tracking-wide text-ink-soft">{label}</dt>
          {/*
            Tanpa `truncate`: nama penyusun adalah isi bermakna, dan memotongnya
            menjadi "Muhammad Ibra…" menghilangkan justru bagian yang dicari
            pembacanya (standar §23.2). Nama panjang turun baris.
          */}
          <dd className="mt-0.5 text-body leading-5 text-ink">{nilai}</dd>
        </div>
      ))}
    </dl>
  );
}
