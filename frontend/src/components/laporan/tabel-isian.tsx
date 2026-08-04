'use client';

import { ChevronRight, Maximize2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { IsianKolom } from '@/components/laporan/isian-kolom';
import { PanelBaris } from '@/components/laporan/panel-baris';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/cn';
import { useLebarLayar, LAYAR_SEMPIT } from '@/lib/use-lebar-layar';
import { barisKosong, hitungPratinjau, type NilaiBaris, type NilaiSel } from '@/lib/laporan';
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
  /** Bentuk pengisian bawaan template ini: `grid` atau `baris`. */
  bentukBawaan?: string;
}

/** Lebar minimum sel per tipe — sebelumnya rata untuk semua kolom. */
const LEBAR: Partial<Record<KolomTemplate['tipe'], string>> = {
  boolean: 'min-w-16',
  integer: 'min-w-24',
  decimal: 'min-w-24',
  month: 'min-w-28',
  date: 'min-w-32',
  select: 'min-w-32',
  master: 'min-w-40',
  textarea: 'min-w-56',
};

/** Lebar kolom nomor baris, dan lebar tiap kolom beku. Dipakai menghitung `left`. */
const LEBAR_NOMOR = 40;
const LEBAR_BEKU = 160;

/** Paling banyak dua kolom beku — lebih dari itu memakan lebar yang diselamatkan. */
const MAKSIMAL_BEKU = 2;

/**
 * Tabel isian satu bagian laporan, dibentuk dari definisi kolom template.
 *
 * Kolom yang punya `grup` ditampilkan di bawah satu header bersama, meniru
 * bentuk lembar kerja aslinya — Produksi mengelompokkan kolomnya di bawah
 * Oven, Ayak, Packing, dan Xray.
 *
 * Tabel menggulir di dalam dirinya sendiri; halaman tidak pernah menggulir
 * mendatar (standar UI/UX §6.2). Kolom yang ditandai beku tetap menempel di
 * kiri saat digulir, sehingga masih jelas baris mana yang sedang diisi.
 *
 * **Papan ketik.** Tab dan Shift-Tab dibiarkan apa adanya — itu perilaku bawaan
 * peramban dan sudah benar. Yang ditambahkan:
 *
 * - `Enter` turun satu baris pada kolom yang sama
 * - `Enter` di sel terakhir baris terakhir menambah baris baru
 * - `Alt` + panah berpindah sel ke segala arah
 *
 * `Alt` dipakai, bukan panah polos, karena sel dapat berisi `Select` (Radix)
 * dan `DatePicker` serta `Combobox` (React Aria) yang menangkap panah dan Enter
 * untuk keperluannya sendiri. Penangannya juga berhenti begitu fokus berada di
 * dalam kontrol semacam itu — mengambil alih tombolnya akan merusak keduanya.
 */
export function TabelIsian({
  kolom,
  baris,
  onUbah,
  galat = {},
  awalanGalat = '',
  terkunci = false,
  bentukBawaan = 'grid',
}: TabelIsianProps) {
  const grup = susunGrup(kolom);
  const adaGrup = grup.some((g) => g.nama !== null);

  const layarSempit = useLebarLayar(LAYAR_SEMPIT);
  const [mode, setMode] = useState<'grid' | 'baris'>(
    bentukBawaan === 'baris' ? 'baris' : 'grid',
  );
  const [barisTerbuka, setBarisTerbuka] = useState<number | null>(null);

  /*
   * Layar sempit selalu memakai form per baris: tabel padat tidak terbaca di
   * sana, dan menggulir mendatar di layar kecil adalah persis keluhan yang
   * hendak diselesaikan.
   */
  const modeEfektif = layarSempit ? 'baris' : mode;

  /** Baris mana saja yang punya galat — dipakai menandai baris di daftar. */
  function barisBermasalah(index: number): boolean {
    return Object.keys(galat).some((kunci) => kunci.startsWith(`${awalanGalat}.${index}.`));
  }

  function ubahSel(index: number, kunci: string, nilai: NilaiSel) {
    onUbah?.(
      baris.map((isi, i) => {
        if (i !== index) return isi;

        const baru = { ...isi, [kunci]: nilai };

        /*
         * Mengganti kolom penyaring mengosongkan kolom yang disaringnya.
         * Membiarkannya berarti meninggalkan pasangan yang mustahil — LOT
         * milik supplier lain — yang baru ditolak server saat disimpan.
         */
        for (const anak of kolom) {
          if (anak.master_induk_kunci === kunci) baru[anak.kunci] = null;
        }

        return baru;
      }),
    );
  }

  function galatSel(index: number, kunci: string): string | undefined {
    return galat[`${awalanGalat}.${index}.${kunci}`]?.[0];
  }

  /** Kode master pada kolom penyaring sebuah kolom, bila ada. */
  function indukKode(isi: NilaiBaris, item: KolomTemplate): string | null {
    if (!item.master_induk_kunci) return null;

    const nilaiInduk = isi[item.master_induk_kunci];

    if (nilaiInduk !== null && typeof nilaiInduk === 'object' && 'kode' in nilaiInduk) {
      return nilaiInduk.kode;
    }

    return typeof nilaiInduk === 'string' && nilaiInduk !== '' ? nilaiInduk : null;
  }

  /*
   * Kolom beku diambil dari urutan kolom, bukan dari urutan penandaannya:
   * `position: sticky left` hanya masuk akal untuk kolom yang memang berada di
   * kiri. Kolom bertanda beku yang letaknya di tengah tabel diabaikan.
   */
  const urutanBeku = new Map<string, number>();
  for (const item of kolom) {
    if (!item.beku) break;
    if (urutanBeku.size >= MAKSIMAL_BEKU) break;

    urutanBeku.set(item.kunci, urutanBeku.size);
  }

  /** Gaya menempel untuk sel kolom beku, atau undefined bila tidak beku. */
  function gayaBeku(kunci: string) {
    const posisi = urutanBeku.get(kunci);

    return posisi === undefined
      ? undefined
      : { left: LEBAR_NOMOR + posisi * LEBAR_BEKU, width: LEBAR_BEKU, minWidth: LEBAR_BEKU };
  }

  /**
   * Memindahkan fokus antar sel.
   *
   * Sel dialamati lewat `data-sel`, bukan lewat urutan tab: sebagian kontrol
   * memuat lebih dari satu elemen yang dapat difokus, sehingga menghitung
   * urutan tab akan meleset.
   */
  function fokuskan(barisTujuan: number, kolomTujuan: number): boolean {
    const sel = document.querySelector<HTMLElement>(
      `[data-sel="${awalanGalat}-${barisTujuan}-${kolomTujuan}"]`,
    );

    const isian = sel?.querySelector<HTMLElement>('input, textarea, [role="combobox"], button');

    if (!isian) return false;

    isian.focus();
    if (isian instanceof HTMLInputElement || isian instanceof HTMLTextAreaElement) {
      isian.select();
    }

    return true;
  }

  function tombolSel(
    event: React.KeyboardEvent<HTMLTableCellElement>,
    barisIni: number,
    kolomIni: number,
  ) {
    if (terkunci) return;

    /*
     * Kontrol yang menangani tombolnya sendiri dibiarkan sepenuhnya. Tanpa
     * penjaga ini, panah tidak lagi memindahkan pilihan di dalam Select dan
     * Enter tidak lagi memilih isi Combobox.
     */
    const sasaran = event.target as HTMLElement;
    const kontrolSendiri = sasaran.closest(
      '[role="combobox"], [role="listbox"], [role="group"], textarea',
    );

    const denganAlt = event.altKey;

    if (kontrolSendiri && !denganAlt) return;

    if (denganAlt && event.key.startsWith('Arrow')) {
      const arah = {
        ArrowUp: [barisIni - 1, kolomIni],
        ArrowDown: [barisIni + 1, kolomIni],
        ArrowLeft: [barisIni, kolomIni - 1],
        ArrowRight: [barisIni, kolomIni + 1],
      }[event.key];

      if (arah && fokuskan(arah[0], arah[1])) event.preventDefault();

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (fokuskan(barisIni + 1, kolomIni)) return;

      // Baris terakhir: Enter menambah baris baru dan pindah ke sana, supaya
      // mengisi berturut-turut tidak perlu menyentuh tetikus sama sekali.
      onUbah?.([...baris, barisKosong(kolom)]);

      // Baris barunya baru ada setelah render berikutnya.
      requestAnimationFrame(() => fokuskan(barisIni + 1, kolomIni));

      return;
    }

    if (event.key === 'Escape') {
      (event.target as HTMLElement).blur();
    }
  }

  /** Nomor urut sel dalam satu baris, dipakai penomoran fokus. */
  let nomorKolom = -1;

  const panel = !terkunci && barisTerbuka !== null && (
    <PanelBaris
      terbuka
      onTutup={() => setBarisTerbuka(null)}
      kolom={kolom}
      baris={baris}
      index={barisTerbuka}
      onPindah={setBarisTerbuka}
      onUbah={(diubah) => onUbah?.(diubah)}
      galat={galat}
      awalanGalat={awalanGalat}
    />
  );

  /*
   * Mode per baris: daftar ringkas berisi beberapa kolom pertama, sisanya
   * dibuka lewat panel. Tidak ada gulir mendatar sama sekali.
   */
  if (modeEfektif === 'baris' && !terkunci) {
    const ringkas = kolom.slice(0, 2);

    return (
      <div className="overflow-hidden rounded-card border border-line">
        {!layarSempit && (
          <div className="flex items-center justify-end border-b border-line px-2 py-1.5">
            <ButtonGroup
              label="Bentuk pengisian"
              nilai={mode}
              onUbah={(nilai) => setMode(nilai === 'baris' ? 'baris' : 'grid')}
              opsi={[
                { nilai: 'grid', label: 'Grid' },
                { nilai: 'baris', label: 'Per Baris' },
              ]}
            />
          </div>
        )}

        <ul className="divide-y divide-line">
          {baris.map((isi, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => setBarisTerbuka(index)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-muted"
              >
                <span className="w-6 shrink-0 text-caption text-ink-soft">{index + 1}</span>

                <span className="min-w-0 flex-1">
                  {ringkas.map((item) => (
                    <span key={item.kunci} className="block text-body text-ink">
                      <span className="text-ink-soft">{item.label}: </span>
                      {ringkasNilai(isi[item.kunci])}
                    </span>
                  ))}
                </span>

                {/* Validasi tidak boleh tersembunyi di balik panel (§2). */}
                {barisBermasalah(index) && (
                  <span
                    aria-label="Baris ini masih bermasalah"
                    className="size-2 shrink-0 rounded-full bg-danger"
                  />
                )}

                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-soft" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onUbah?.([...baris, barisKosong(kolom)])}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line px-3 py-2 text-body text-ink-muted transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tambah Baris
        </button>

        {panel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line">
      {!terkunci && !layarSempit && (
        <div className="flex items-center justify-end border-b border-line px-2 py-1.5">
          <ButtonGroup
            label="Bentuk pengisian"
            nilai={mode}
            onUbah={(nilai) => setMode(nilai === 'baris' ? 'baris' : 'grid')}
            opsi={[
              { nilai: 'grid', label: 'Grid' },
              { nilai: 'baris', label: 'Per Baris' },
            ]}
          />
        </div>
      )}

      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full min-w-max border-collapse text-table">
          {/*
            Lapisan z ditulis eksplisit karena inilah yang paling mudah salah:
            header harus di atas sel biasa, sel beku di atas sel biasa, dan
            header beku di atas keduanya.
          */}
          <thead className="sticky top-0 z-20 bg-surface-muted">
            {adaGrup && (
              <tr className="border-b border-line">
                <th
                  className="sticky left-0 z-30 w-10 bg-surface-muted px-2 py-1.5"
                  style={{ width: LEBAR_NOMOR }}
                />
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
              <th
                className="sticky left-0 z-30 w-10 bg-surface-muted px-2 py-2 text-center text-caption font-semibold text-ink-soft"
                style={{ width: LEBAR_NOMOR }}
              >
                #
              </th>
              {grup.map((g, gi) =>
                g.kolom.map((item, ki) => {
                  const beku = gayaBeku(item.kunci);

                  return (
                    <th
                      key={item.kunci}
                      scope="col"
                      style={beku}
                      // `title` memunculkan teks bantuan yang selama ini
                      // tersimpan di template tetapi tidak pernah dirender.
                      title={item.bantuan ?? undefined}
                      className={cn(
                        'whitespace-nowrap px-2 py-2 text-left text-caption font-semibold text-ink-muted',
                        ki === 0 && g.nama && gi > 0 && 'border-l border-line',
                        beku && 'sticky z-30 bg-surface-muted',
                      )}
                    >
                      {item.label}
                      {item.satuan && (
                        <span className="ml-1 font-normal text-ink-soft">({item.satuan})</span>
                      )}
                      {item.wajib && <span className="ml-0.5 text-danger">*</span>}
                      {item.bantuan && <span className="sr-only"> — {item.bantuan}</span>}
                    </th>
                  );
                }),
              )}
              {!terkunci && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>

          <tbody className="divide-y divide-line bg-surface">
            {baris.map((isi, index) => {
              // Dihitung ulang tiap baris supaya nomor selnya sejajar antar baris.
              nomorKolom = -1;

              return (
              <tr key={index} className="align-top">
                <td
                  className="sticky left-0 z-10 w-10 bg-surface px-2 py-1.5 text-center text-caption text-ink-soft"
                  style={{ width: LEBAR_NOMOR }}
                >
                  {index + 1}
                </td>

                {grup.map((g, gi) =>
                  g.kolom.map((item, ki) => {
                    const beku = gayaBeku(item.kunci);
                    const nomor = ++nomorKolom;

                    return (
                    <td
                      key={item.kunci}
                      data-sel={`${awalanGalat}-${index}-${nomor}`}
                      onKeyDown={(e) => tombolSel(e, index, nomor)}
                      style={beku}
                      className={cn(
                        'px-2 py-1.5',
                        ki === 0 && g.nama && gi > 0 && 'border-l border-line',
                        beku ? 'sticky z-10 bg-surface' : (LEBAR[item.tipe] ?? 'min-w-32'),
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
                        indukKode={indukKode(isi, item)}
                      />

                      {galatSel(index, item.kunci) && (
                        <span className="mt-0.5 block text-meta text-danger-text">
                          {galatSel(index, item.kunci)}
                        </span>
                      )}
                    </td>
                    );
                  }),
                )}

                {!terkunci && (
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setBarisTerbuka(index)}
                      aria-label={`Buka baris ${index + 1} sebagai form`}
                      title="Buka seluruh kolom baris ini"
                      className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
                    >
                      <Maximize2 aria-hidden="true" className="size-3.5" />
                    </button>
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
              );
            })}
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

      {panel}
    </div>
  );
}

/** Ringkasan satu nilai untuk daftar baris pada mode per baris. */
function ringkasNilai(isi: NilaiSel | undefined): string {
  if (isi === null || isi === undefined || isi === '') return '—';
  if (typeof isi === 'boolean') return isi ? 'Ya' : 'Tidak';
  if (typeof isi === 'object' && 'nama' in isi) return isi.nama;

  return String(isi);
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
