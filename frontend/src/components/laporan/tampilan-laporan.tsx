'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { TampilKaya } from '@/components/ui/tampil-kaya';
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
 * ## Label di atas nilai, bukan di sebelahnya
 *
 * Bentuk label-kiri/nilai-kanan menyisakan sisa lebar kolom bagi nilainya. Pada
 * kisi tiga kolom, label "Tanggal Mulai Produksi" menghabiskan hampir seluruh
 * sel, dan "5 Agustus 2026" — tiga kata pendek — pecah menjadi tiga baris.
 * Menumpuknya memberi nilai itu **seluruh** lebar selnya.
 *
 * ## Lebar sel mengikuti isinya
 *
 * Nilai panjang memesan dua sel, teks bebas memesan satu baris penuh. Tanpa itu
 * seluruh sel harus selebar isi terpanjang, dan laporan yang isinya pendek-
 * pendek berubah menjadi ladang kosong.
 *
 * ## Kepadatan adalah tujuannya, bukan efek samping
 *
 * Skala hurufnya sengaja kecil: label 10px, nilai 13px. Satu baris laporan
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
      <h3 className="sticky top-0 z-10 flex items-baseline gap-2 bg-surface/95 py-1 backdrop-blur">
        <span className="font-heading text-body-lg font-semibold text-ink">
          {bagian.template.nama}
        </span>
        <span className="text-caption font-normal text-ink-soft">
          {formatAngka(bagian.baris.length)} baris
        </span>
        <span aria-hidden className="h-px flex-1 bg-line" />
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
    <article className="laporan-wadah overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-2.5 py-1">
        <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-control bg-primary-subtle px-1 text-meta font-semibold tabular-nums text-primary-text">
          {nomor}
        </span>
        <span className="text-caption text-ink-soft">{formatAngka(terisi.length)} isian</span>
        {status && (
          <span className="ml-auto">
            <StatusBadge status={status} />
          </span>
        )}
      </header>

      {terisi.length === 0 ? (
        <p className="px-2.5 py-2 text-body text-ink-soft">Baris ini belum berisi apa pun.</p>
      ) : (
        <div className="divide-y divide-line/60">
          {[...grup.entries()].map(([namaGrup, isiGrup]) => (
            <div key={namaGrup || 'tanpa-grup'} className="px-2.5 py-2">
              {namaGrup && (
                /*
                 * Nama grup ikut ditampilkan: pada template dengan kolom
                 * berulang — QTY Masuk pada tahap Oven dan pada tahap Ayak —
                 * labelnya sama persis dan hanya grupnya yang membedakan.
                 */
                <p className="mb-1.5 flex items-center gap-2 text-meta font-semibold uppercase tracking-wide text-primary-text">
                  {namaGrup}
                  <span aria-hidden className="h-px flex-1 bg-primary-subtle" />
                </p>
              )}

              <dl className="laporan-kisi">
                {isiGrup.map((satu) => (
                  <Isian key={satu.kunci} kolom={satu} nilai={baris[satu.kunci]} />
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/** Satu pasangan label–nilai, selebar isinya. */
function Isian({ kolom, nilai }: { kolom: KolomTemplate; nilai: NilaiSel | undefined }) {
  const teks = tampilkan(nilai, kolom);
  const lebar = lebarSel(kolom, teks);

  return (
    <div
      className={cn(
        'min-w-0',
        lebar === 2 && 'laporan-luas',
        lebar === 3 && 'laporan-penuh',
      )}
    >
      <dt className="text-meta uppercase leading-4 tracking-wide text-ink-soft">
        {kolom.label}
        {kolom.satuan && <span className="ml-0.5 normal-case">({kolom.satuan})</span>}
      </dt>
      <dd className="min-w-0">
        <NilaiTampil kolom={kolom} nilai={nilai} teks={teks} />
      </dd>
    </div>
  );
}

/**
 * Nilai dengan penekanan yang sesuai jenisnya.
 *
 * Angka dicetak tebal dan disejajarkan `tabular-nums` supaya dapat dibandingkan
 * antar baris; tanggal ditahan agar tidak pernah patah di tengah — patahnya
 * justru pada bagian yang paling sering dicari mata.
 */
function NilaiTampil({
  kolom,
  nilai,
  teks,
}: {
  kolom: KolomTemplate;
  nilai: NilaiSel | undefined;
  teks: string;
}) {
  if (!berisi(nilai)) {
    return <span className="text-body leading-5 text-ink-soft">—</span>;
  }

  if (kolom.tipe === 'textarea') {
    return (
      <TampilKaya
        isi={teks}
        className="mt-0.5 block rounded-input bg-surface-muted/60 px-2 py-1 text-body leading-5 text-ink"
        kosong=""
      />
    );
  }

  if (kolom.tipe === 'integer' || kolom.tipe === 'decimal') {
    return (
      <span className="text-body font-semibold leading-5 tabular-nums text-ink">{teks}</span>
    );
  }

  if (kolom.tipe === 'date' || kolom.tipe === 'month') {
    // Nilainya pendek dan bermakna sebagai satu kesatuan; membiarkannya patah
    // menghasilkan "5 / Agustus / 2026" pada tiga baris terpisah.
    return <span className="block text-body leading-5 text-ink">{teks}</span>;
  }

  if (kolom.tipe === 'multiselect') {
    const daftar = teks.split(', ').filter(Boolean);

    return (
      <span className="mt-0.5 flex flex-wrap gap-1">
        {daftar.map((satu) => (
          <span
            key={satu}
            className="rounded-control bg-surface-muted px-1.5 py-px text-caption leading-4 text-ink-muted"
          >
            {satu}
          </span>
        ))}
      </span>
    );
  }

  if (kolom.tipe === 'boolean') {
    return (
      <span className="flex items-center gap-1 text-body leading-5 text-ink">
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            teks === 'Ya' ? 'bg-secondary' : 'bg-ink-soft',
          )}
        />
        {teks}
      </span>
    );
  }

  // `truncate` dilarang untuk isi bermakna (standar §23.2): teks panjang turun
  // baris, tidak pernah dipotong.
  return <span className="block break-words text-body leading-5 text-ink">{teks}</span>;
}

/**
 * Berapa sel yang pantas dipakai satu isian.
 *
 * Diperkirakan dari panjang teksnya, bukan dari tipe kolomnya saja: kolom
 * bertipe teks bisa berisi "OK" maupun nama perusahaan tiga kata, dan keduanya
 * tidak layak mendapat lebar yang sama. Labelnya ikut dihitung — label 10px
 * kira-kira tiga perempat lebar nilai 13px — sebab label panjang pada nilai
 * pendek tetap membutuhkan tempat.
 */
function lebarSel(kolom: KolomTemplate, teks: string): 1 | 2 | 3 {
  if (kolom.tipe === 'textarea') return 3;

  const panjangLabel = kolom.label.length + (kolom.satuan?.length ?? 0);
  const panjang = Math.max(teks.length, panjangLabel * 0.75);

  if (panjang > 40) return 3;
  if (panjang > 18) return 2;

  return 1;
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

/**
 * Kepala laporan: tanggal, penyusun, dan departemennya.
 *
 * Berbentuk keping sebaris, bukan tiga kartu bertumpuk. Ketiganya isian pendek;
 * memberi masing-masing satu kartu selebar sepertiga layar membuat "5 Agustus
 * 2026" menempati tiga baris dan mendorong isi laporannya turun.
 */
export function KepalaLaporan({ laporan }: { laporan: Laporan }) {
  const keterangan = [
    ['Penyusun', laporan.penyusun?.nama ?? '—'],
    ['Departemen', laporan.departemen?.nama ?? '—'],
    ['Tanggal', formatTanggalRingkas(laporan.tanggal)],
  ] as const;

  return (
    <dl className="flex flex-wrap items-center gap-1.5">
      {keterangan.map(([label, nilai]) => (
        <div
          key={label}
          className="flex min-w-0 items-baseline gap-1.5 rounded-input border border-line bg-surface-muted/60 px-2 py-0.5"
        >
          <dt className="shrink-0 text-meta uppercase tracking-wide text-ink-soft">{label}</dt>
          {/*
            Tanpa `truncate`: nama penyusun adalah isi bermakna, dan memotongnya
            menjadi "Muhammad Ibra…" menghilangkan justru bagian yang dicari
            pembacanya (standar §23.2). Nama panjang turun baris.
          */}
          <dd className="min-w-0 break-words text-body leading-5 text-ink">{nilai}</dd>
        </div>
      ))}
    </dl>
  );
}
