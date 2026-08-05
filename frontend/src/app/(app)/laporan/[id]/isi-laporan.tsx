'use client';

import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

import { TabelIsian } from '@/components/laporan/tabel-isian';
import { TampilanLaporan } from '@/components/laporan/tampilan-laporan';
import { PillNav, type ItemTab } from '@/components/ui/pill-nav';
import { cn } from '@/lib/cn';
import type { Laporan } from '@/lib/laporan';

/**
 * Isi laporan, dengan dua cara membacanya.
 *
 * **Baca** menampilkan tiap baris sebagai kartu berisi pasangan label dan
 * nilai — bentuk yang dipakai peninjau dan atasan, yang tidak ikut mengetiknya
 * dan tidak hafal urutan kolomnya.
 *
 * **Tabel** mempertahankan bentuk grid yang sama persis dengan layar
 * pengisian, karena penyusunnya sendiri sudah mengenal letak tiap kolom dan
 * membandingkan nilai antar baris jauh lebih mudah di sana.
 *
 * Bawaannya Baca: yang paling sering membuka halaman ini bukan penyusunnya.
 */
export function IsiLaporan({ laporan }: { laporan: Laporan }) {
  const [bentuk, setBentuk] = useState<'baca' | 'tabel'>('baca');

  const bagian = laporan.bagian ?? [];

  if (bagian.length === 0) {
    return (
      <p className="card p-8 text-center text-body-lg text-ink-soft">
        Laporan ini belum punya isi.
      </p>
    );
  }

  const tab: ItemTab[] = bagian.map((item) => ({
    nilai: item.template.kode.toLowerCase(),
    label: item.template.nama,
    jumlah: item.baris.length,
    isi: (
      <TabelIsian
        kolom={item.template.kolom}
        baris={item.baris.map((b) => b.nilai)}
        terkunci
      />
    ),
  }));

  return (
    <>
      <div className="mb-2 flex items-center justify-end gap-1">
        {(
          [
            ['baca', 'Baca', List],
            ['tabel', 'Tabel', LayoutGrid],
          ] as const
        ).map(([nilai, label, Ikon]) => (
          <button
            key={nilai}
            type="button"
            onClick={() => setBentuk(nilai)}
            aria-pressed={bentuk === nilai}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-body transition-colors duration-fast',
              bentuk === nilai
                ? 'border-primary bg-primary-subtle font-medium text-primary-text'
                : 'border-line text-ink-muted hover:bg-surface-muted',
            )}
          >
            <Ikon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {bentuk === 'baca' ? (
        <section className="card p-3">
          <TampilanLaporan laporan={laporan} />
        </section>
      ) : (
        <PillNav item={tab} kunciUrl="bagian" />
      )}
    </>
  );
}
