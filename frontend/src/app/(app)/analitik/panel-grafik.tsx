import type { ReactNode } from 'react';

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
}: {
  judul: string;
  keterangan?: string;
  grafik: ReactNode;
  tabel: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-3">
      <h2 className="font-heading text-section-title text-ink">{judul}</h2>
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
