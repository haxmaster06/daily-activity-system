'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IsianKolom } from '@/components/laporan/isian-kolom';
import { FieldGroup } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { hitungPratinjau, type NilaiBaris, type NilaiSel } from '@/lib/laporan';
import type { KolomTemplate } from '@/lib/template';

interface Props {
  terbuka: boolean;
  onTutup: () => void;
  kolom: KolomTemplate[];
  baris: NilaiBaris[];
  /** Baris yang sedang dibuka. */
  index: number;
  onPindah: (index: number) => void;
  onUbah: (baris: NilaiBaris[]) => void;
  galat?: Record<string, string[]>;
  awalanGalat?: string;
}

/**
 * Mengisi satu baris sebagai form vertikal.
 *
 * Dibangun di atas `Modal` yang ada, bukan panel sendiri: `docs/standar-ui-ux.md`
 * §7.2 melarang membuat modal di luar komponen itu, dan `Modal` sudah memberi
 * judul serta baris tombol yang tetap sementara hanya badannya menggulir —
 * persis yang dibutuhkan di sini.
 *
 * Seluruh kolom tersusun ke bawah, sehingga **tidak ada gulir mendatar sama
 * sekali**. Ini jalan keluar untuk template yang kolomnya terlalu banyak untuk
 * dibaca sekaligus, dan untuk layar sempit.
 */
export function PanelBaris({
  terbuka,
  onTutup,
  kolom,
  baris,
  index,
  onPindah,
  onUbah,
  galat = {},
  awalanGalat = '',
}: Props) {
  const isi = baris[index];

  if (!isi) return null;

  function ubahSel(kunci: string, nilai: NilaiSel) {
    onUbah(
      baris.map((satu, i) => {
        if (i !== index) return satu;

        const baru = { ...satu, [kunci]: nilai };

        // Aturan yang sama dengan mode grid: mengganti kolom penyaring
        // mengosongkan kolom yang disaringnya.
        for (const anak of kolom) {
          if (anak.master_induk_kunci === kunci) baru[anak.kunci] = null;
        }

        return baru;
      }),
    );
  }

  function galatSel(kunci: string): string | undefined {
    return galat[`${awalanGalat}.${index}.${kunci}`]?.[0];
  }

  function indukKode(item: KolomTemplate): string | null {
    if (!item.master_induk_kunci) return null;

    const nilaiInduk = isi[item.master_induk_kunci];

    if (nilaiInduk !== null && typeof nilaiInduk === 'object' && 'kode' in nilaiInduk) {
      return nilaiInduk.kode;
    }

    return typeof nilaiInduk === 'string' && nilaiInduk !== '' ? nilaiInduk : null;
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      lebar="lebar"
      judul={`Baris ${index + 1} dari ${baris.length}`}
      aksi={
        <>
          <button
            type="button"
            onClick={() => onPindah(index - 1)}
            disabled={index === 0}
            aria-label="Baris sebelumnya"
            className="btn-ghost btn-sm gap-1 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => onPindah(index + 1)}
            disabled={index === baris.length - 1}
            aria-label="Baris berikutnya"
            className="btn-ghost btn-sm gap-1 disabled:opacity-30"
          >
            Berikutnya
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={onTutup} className="btn-primary btn-sm">
            Selesai
          </button>
        </>
      }
    >
      <FieldGroup kolom={2}>
        {kolom.map((item) => (
          <div key={item.kunci} className={item.tipe === 'textarea' ? 'sm:col-span-2' : undefined}>
            <label htmlFor={`panel-${index}-${item.kunci}`} className="field-label">
              {item.label}
              {item.satuan && <span className="ml-1 font-normal text-ink-soft">({item.satuan})</span>}
              {item.wajib && <span className="ml-0.5 text-danger">*</span>}
            </label>

            <IsianKolom
              kolom={item}
              nilai={isi}
              onUbah={ubahSel}
              hasilHitungan={item.rumus ? hitungPratinjau(item.rumus, isi) : undefined}
              galat={galatSel(item.kunci)}
              idBaris={`panel-${index}`}
              indukKode={indukKode(item)}
            />

            {item.bantuan && !galatSel(item.kunci) && (
              <span className="mt-1 block text-caption text-ink-soft">{item.bantuan}</span>
            )}
            {galatSel(item.kunci) && (
              <span className="field-error">{galatSel(item.kunci)}</span>
            )}
          </div>
        ))}
      </FieldGroup>
    </Modal>
  );
}
