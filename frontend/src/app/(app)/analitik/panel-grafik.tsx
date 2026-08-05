import type { ReactNode } from 'react';
import { MousePointerClick } from 'lucide-react';

/**
 * Satu grafik beserta tabel angkanya.
 *
 * **Tabelnya wajib, bukan pelengkap.** Chart.js menggambar ke `<canvas>`:
 * seluruh grafik hanya satu elemen DOM, tanpa satu pun titik data yang dapat
 * difokus papan ketik, dan pembaca layar tidak menemukan apa pun di dalamnya.
 * `docs/standar-ui-ux.md` §1 menempatkan aksesibilitas sebagai syarat
 * kelulusan, sehingga tabel angka menjadi satu-satunya jalan isi grafik ini
 * sampai ke pembacanya.
 *
 * Tabelnya **tidak dapat dilipat.** Rencana semula membolehkannya asalkan
 * tetap ada di DOM, tetapi isi yang dilipat berakhir `display: none` dan
 * lenyap dari pohon aksesibilitas — persis hal yang hendak dihindari. Karena
 * itu tabelnya selalu tampil, berdampingan dengan grafiknya pada layar lebar.
 */
export function PanelGrafik({
  judul,
  keterangan,
  grafik,
  tabel,
  dapatDisaring = false,
}: {
  judul: string;
  keterangan?: string;
  grafik: ReactNode;
  tabel: ReactNode;
  /** Menyalakan keterangan bahwa grafiknya dapat ditekan untuk menyaring. */
  dapatDisaring?: boolean;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-heading text-section-title text-ink">{judul}</h2>

        {/*
          Grafik yang dapat ditekan tidak punya penanda visual apa pun — kanvas
          tidak berubah bentuk saat disorot. Tanpa kalimat ini, satu-satunya cara
          mengetahuinya adalah menekannya secara kebetulan.
        */}
        {dapatDisaring && (
          <p className="inline-flex items-center gap-1 text-caption text-ink-soft">
            <MousePointerClick aria-hidden="true" className="size-3.5" />
            Tekan grafik atau baris tabel untuk menyaring
          </p>
        )}
      </div>

      {keterangan && <p className="mt-0.5 text-body text-ink-muted">{keterangan}</p>}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/*
          Tinggi dikunci. Tanpa itu Chart.js memakai rasio bawaannya dan
          grafiknya memanjang tak terkendali saat kolomnya melebar.
        */}
        <div className="h-64 min-w-0">{grafik}</div>

        <div className="min-w-0">{tabel}</div>
      </div>
    </section>
  );
}
