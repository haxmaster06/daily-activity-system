'use client';

import { Plus, Trash2 } from 'lucide-react';

import { IsianKolom } from '@/components/laporan/isian-kolom';
import { cn } from '@/lib/cn';
import { barisKosong, hitungPratinjau, type NilaiBaris } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';

interface TabelIsianProps {
  kolom: KolomTemplate[];
  baris: NilaiBaris[];
  /**
   * Tidak diisi saat `terkunci` — Server Component tidak dapat mengirim
   * fungsi ke Client Component, dan mode baca saja memang tidak mengubah apa
   * pun.
   */
  onUbah?: (baris: NilaiBaris[]) => void;
  /** Galat per baris dan kunci kolom, dari validasi server. */
  galat?: Record<string, string[]>;
  /** Awalan kunci galat, mis. "sections.0.items". */
  awalanGalat?: string;
  terkunci?: boolean;
}

/**
 * Tabel isian satu bagian laporan, dibentuk dari definisi kolom template.
 *
 * Kolom yang punya `grup` ditampilkan di bawah satu header bersama, meniru
 * bentuk lembar kerja aslinya — Produksi mengelompokkan kolomnya di bawah
 * Oven, Ayak, Packing, dan Xray.
 *
 * Tabel menggulir di dalam dirinya sendiri; halaman tidak pernah menggulir
 * mendatar (standar UI/UX §6.2).
 */
export function TabelIsian({
  kolom,
  baris,
  onUbah,
  galat = {},
  awalanGalat = '',
  terkunci = false,
}: TabelIsianProps) {
  const grup = susunGrup(kolom);
  const adaGrup = grup.some((g) => g.nama !== null);

  function ubahSel(index: number, kunci: string, nilai: string | number | boolean | null) {
    onUbah?.(baris.map((isi, i) => (i === index ? { ...isi, [kunci]: nilai } : isi)));
  }

  function galatSel(index: number, kunci: string): string | undefined {
    return galat[`${awalanGalat}.${index}.${kunci}`]?.[0];
  }

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full min-w-max border-collapse text-table">
          <thead className="sticky top-0 z-10 bg-surface-muted">
            {adaGrup && (
              <tr className="border-b border-line">
                <th className="w-10 px-2 py-1.5" />
                {grup.map((g, i) => (
                  <th
                    key={`${g.nama ?? 'tanpa'}-${i}`}
                    colSpan={g.kolom.length}
                    className={cn(
                      'px-2 py-1.5 text-center text-caption font-semibold uppercase tracking-wide',
                      g.nama ? 'border-l border-line text-ink-muted' : 'text-transparent',
                    )}
                  >
                    {g.nama ?? '.'}
                  </th>
                ))}
                {!terkunci && <th className="w-10 px-2 py-1.5" />}
              </tr>
            )}

            <tr className="border-b border-line">
              <th className="w-10 px-2 py-2 text-center text-caption font-semibold text-ink-soft">
                #
              </th>
              {grup.map((g, gi) =>
                g.kolom.map((item, ki) => (
                  <th
                    key={item.kunci}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-2 py-2 text-left text-caption font-semibold text-ink-muted',
                      ki === 0 && g.nama && gi > 0 && 'border-l border-line',
                    )}
                  >
                    {item.label}
                    {item.satuan && (
                      <span className="ml-1 font-normal text-ink-soft">({item.satuan})</span>
                    )}
                    {item.wajib && <span className="ml-0.5 text-danger">*</span>}
                  </th>
                )),
              )}
              {!terkunci && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>

          <tbody className="divide-y divide-line bg-surface">
            {baris.map((isi, index) => (
              <tr key={index} className="align-top">
                <td className="px-2 py-1.5 text-center text-caption text-ink-soft">
                  {index + 1}
                </td>

                {grup.map((g, gi) =>
                  g.kolom.map((item, ki) => (
                    <td
                      key={item.kunci}
                      className={cn(
                        'px-2 py-1.5',
                        ki === 0 && g.nama && gi > 0 && 'border-l border-line',
                        item.tipe === 'textarea' ? 'min-w-56' : 'min-w-32',
                      )}
                    >
                      <IsianKolom
                        kolom={item}
                        nilai={isi}
                        onUbah={(kunci, nilai) => ubahSel(index, kunci, nilai)}
                        hasilHitungan={item.rumus ? hitungPratinjau(item.rumus, isi) : undefined}
                        galat={galatSel(index, item.kunci)}
                        idBaris={`b${index}`}
                        terkunci={terkunci}
                      />

                      {galatSel(index, item.kunci) && (
                        <span className="mt-0.5 block text-meta text-danger-text">
                          {galatSel(index, item.kunci)}
                        </span>
                      )}
                    </td>
                  )),
                )}

                {!terkunci && (
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onUbah?.(baris.filter((_, i) => i !== index))}
                      disabled={baris.length === 1}
                      aria-label={`Hapus baris ${index + 1}`}
                      title="Hapus baris"
                      className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text disabled:opacity-30"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!terkunci && (
        <button
          type="button"
          onClick={() => onUbah?.([...baris, barisKosong(kolom)])}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line px-3 py-2 text-body text-ink-muted transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tambah Baris
        </button>
      )}
    </div>
  );
}

/**
 * Mengelompokkan kolom berurutan yang punya `grup` sama.
 *
 * Pengelompokan mengikuti urutan kolom, bukan mengumpulkan seluruh kolom
 * bergrup sama ke satu tempat — susunan kolom pada template sudah menentukan
 * bentuk tabelnya.
 */
function susunGrup(kolom: KolomTemplate[]): { nama: string | null; kolom: KolomTemplate[] }[] {
  const hasil: { nama: string | null; kolom: KolomTemplate[] }[] = [];

  for (const item of kolom) {
    const nama = item.grup ?? null;
    const terakhir = hasil[hasil.length - 1];

    if (terakhir && terakhir.nama === nama) {
      terakhir.kolom.push(item);
    } else {
      hasil.push({ nama, kolom: [item] });
    }
  }

  return hasil;
}
