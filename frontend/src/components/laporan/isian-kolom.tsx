'use client';

import { Calculator } from 'lucide-react';

import { ButtonGroup } from '@/components/ui/button-group';
import { DatePicker } from '@/components/ui/date-picker';
import { EditorKaya } from '@/components/ui/editor-kaya';
import { InputAngka } from '@/components/ui/input-angka';
import { Select } from '@/components/ui/select';
import { TampilKaya } from '@/components/ui/tampil-kaya';
import { IsianMaster } from '@/components/laporan/isian-master';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import type { NilaiBaris, NilaiSel } from '@/lib/laporan';
import { TIPE_ANGKA, type KolomTemplate, type NilaiMaster } from '@/lib/template';

interface IsianKolomProps {
  kolom: KolomTemplate;
  nilai: NilaiBaris;
  onUbah: (kunci: string, nilai: NilaiSel) => void;
  /** Nilai kolom hitungan, sudah dihitung pemanggil. */
  hasilHitungan?: number | null;
  galat?: string;
  /** Dipakai menyusun id unik antar baris. */
  idBaris: string;
  terkunci?: boolean;
  /** Kode master pada kolom penyaring, bila kolom ini disaring kolom lain. */
  indukKode?: string | null;
}

/**
 * Membaca nilai kolom master.
 *
 * Bentuk skalar tetap diterima: kolom yang dulunya teks lalu diubah menjadi
 * master meninggalkan baris lama berisi string biasa, dan laporan itu harus
 * tetap terbaca selamanya.
 */
function nilaiMaster(isi: unknown): NilaiMaster | null {
  if (isi === null || isi === undefined || isi === '') return null;

  if (typeof isi === 'object' && 'kode' in isi) {
    return isi as NilaiMaster;
  }

  return { kode: String(isi), nama: String(isi) };
}

/**
 * Satu isian pada tabel laporan, dirender dari definisi kolom template.
 *
 * Tiap tipe kolom memakai kontrol yang paling praktis untuk isinya
 * (docs/standar-ui-ux.md §1.1): tanggal memakai DatePicker, pilihan memakai
 * Select, dan hanya keterangan bebas yang memakai teks bebas.
 *
 * Kolom hitungan tidak menerima ketikan sama sekali. Nilainya tampil sebagai
 * hasil, ditandai jelas supaya pengguna tahu itu bukan isian yang perlu diisi
 * (§1.2). Perhitungan yang mengikat tetap dikerjakan server.
 */
export function IsianKolom({
  kolom,
  nilai,
  onUbah,
  hasilHitungan,
  galat,
  idBaris,
  terkunci = false,
  indukKode,
}: IsianKolomProps) {
  const id = `${idBaris}-${kolom.kunci}`;
  const isi = nilai[kolom.kunci];

  if (kolom.rumus) {
    return (
      <div
        className={cn(
          'flex h-input-sm items-center justify-end gap-1.5 rounded-input',
          'border border-dashed border-line bg-surface-muted px-2 text-body tabular-nums',
          hasilHitungan === null || hasilHitungan === undefined
            ? 'text-ink-soft'
            : 'text-ink-muted',
        )}
        title={`Dihitung otomatis dari: ${kolom.rumus}`}
      >
        <Calculator aria-hidden="true" className="size-3 shrink-0 text-ink-soft" />
        <span>{hasilHitungan ?? '—'}</span>
        <span className="sr-only">Dihitung otomatis dari {kolom.rumus}</span>
      </div>
    );
  }

  if (terkunci) {
    /*
     * Kolom keterangan menyimpan HTML sejak diisi lewat editor teks kaya.
     * Menampilkannya sebagai teks biasa membuat `<p>` dan `<li>` terbaca
     * sebagai tulisan di dalam sel — kode program bocor ke layar pembaca.
     */
    if (kolom.tipe === 'textarea') {
      return <TampilKaya isi={typeof isi === 'string' ? isi : null} className="px-1 py-1 text-body text-ink" kosong="—" />;
    }

    return (
      <span className="block px-1 py-1 text-body text-ink">
        {tampilkanNilai(kolom, isi)}
      </span>
    );
  }

  switch (kolom.tipe) {
    case 'select':
      /*
       * Tombol berjajar hanya masuk akal untuk pilihan yang sedikit. Di atas
       * empat pilihan ia melebar melewati selnya dan melanggar §6.5, jadi
       * dikembalikan ke dropdown tanpa perlu administrator memikirkannya.
       */
      if (kolom.tampilan === 'tombol' && (kolom.pilihan ?? []).length <= 4) {
        return (
          <ButtonGroup
            label={kolom.label}
            nilai={typeof isi === 'string' ? isi : ''}
            onUbah={(baru) => onUbah(kolom.kunci, baru)}
            opsi={(kolom.pilihan ?? []).map((p) => ({ nilai: p.nilai, label: p.label }))}
          />
        );
      }

      if (kolom.tampilan === 'radio') {
        return (
          <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <legend className="sr-only">{kolom.label}</legend>
            {(kolom.pilihan ?? []).map((p) => (
              <label key={p.nilai} className="flex items-center gap-1.5 text-body text-ink-muted">
                <input
                  type="radio"
                  name={id}
                  value={p.nilai}
                  checked={isi === p.nilai}
                  onChange={() => onUbah(kolom.kunci, p.nilai)}
                  className="size-3.5 border-line text-primary focus:ring-primary"
                />
                {p.label}
              </label>
            ))}
          </fieldset>
        );
      }

      return (
        <Select
          id={id}
          ukuran="sm"
          placeholder="Pilih..."
          nilai={typeof isi === 'string' ? isi : ''}
          opsi={(kolom.pilihan ?? []).map((p) => ({ nilai: p.nilai, label: p.label }))}
          onUbah={(baru) => onUbah(kolom.kunci, baru)}
          galat={galat}
        />
      );

    case 'multiselect':
      return (
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <legend className="sr-only">{kolom.label}</legend>
          {(kolom.pilihan ?? []).map((p) => {
            const terpilih = Array.isArray(isi) && isi.includes(p.nilai);

            return (
              <label key={p.nilai} className="flex items-center gap-1.5 text-body text-ink-muted">
                <input
                  type="checkbox"
                  checked={terpilih}
                  onChange={(e) => {
                    const sekarang: string[] = Array.isArray(isi) ? isi : [];

                    onUbah(
                      kolom.kunci,
                      e.target.checked
                        ? [...sekarang, p.nilai]
                        : sekarang.filter((satu) => satu !== p.nilai),
                    );
                  }}
                  className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                />
                {p.label}
              </label>
            );
          })}
        </fieldset>
      );

    case 'time':
      return (
        <input
          id={id}
          type="time"
          value={typeof isi === 'string' ? isi : ''}
          onChange={(e) => onUbah(kolom.kunci, e.target.value || null)}
          aria-label={kolom.label}
          aria-invalid={Boolean(galat)}
          className="field field-sm"
        />
      );

    case 'date':
      return (
        <DatePicker
          label={kolom.label}
          // Label kolom sudah menjadi header tabel; merendernya lagi di tiap
          // sel membuat tinggi barisnya berbeda dari sel lain (§6.5).
          tanpaLabel
          ukuran="sm"
          nilai={typeof isi === 'string' ? isi : null}
          onUbah={(baru) => onUbah(kolom.kunci, baru)}
          galat={galat}
        />
      );

    case 'month':
      return (
        <input
          id={id}
          type="month"
          value={typeof isi === 'string' ? isi : ''}
          onChange={(e) => onUbah(kolom.kunci, e.target.value || null)}
          aria-label={kolom.label}
          aria-invalid={Boolean(galat)}
          className="field field-sm"
        />
      );

    case 'boolean':
      if (kolom.tampilan === 'sakelar') {
        return (
          <button
            type="button"
            role="switch"
            aria-checked={isi === true}
            aria-label={kolom.label}
            onClick={() => onUbah(kolom.kunci, isi !== true)}
            className={cn(
              'flex h-input-sm items-center gap-2 rounded-input px-1 text-body',
              isi === true ? 'text-primary' : 'text-ink-soft',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'relative h-4 w-7 shrink-0 rounded-full transition-colors duration-fast',
                isi === true ? 'bg-primary' : 'bg-line',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-3 rounded-full bg-surface transition-all duration-fast',
                  isi === true ? 'left-3.5' : 'left-0.5',
                )}
              />
            </span>
            {isi === true ? 'Ya' : 'Tidak'}
          </button>
        );
      }

      return (
        <label className="flex h-input-sm items-center gap-2 text-body text-ink-muted">
          <input
            id={id}
            type="checkbox"
            checked={isi === true}
            onChange={(e) => onUbah(kolom.kunci, e.target.checked)}
            className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
          />
          <span className="sr-only">{kolom.label}</span>
          Ya
        </label>
      );

    case 'integer':
    case 'decimal':
      return (
        <InputAngka
          id={id}
          nilai={typeof isi === 'number' ? isi : null}
          onUbah={(angka) => onUbah(kolom.kunci, angka)}
          desimal={kolom.tipe === 'integer' ? 0 : (kolom.desimal ?? 2)}
          bulat={kolom.tipe === 'integer'}
          placeholder={kolom.placeholder ?? undefined}
          label={kolom.label}
          bermasalah={Boolean(galat)}
          awalan={kolom.tampilan === 'uang' ? 'Rp' : undefined}
          akhiran={kolom.tampilan === 'persen' ? '%' : undefined}
          stepper={kolom.tampilan === 'stepper'}
        />
      );

    case 'master':
      return (
        <IsianMaster
          id={id}
          kolom={kolom}
          nilai={nilaiMaster(isi)}
          onUbah={(dipilih) => onUbah(kolom.kunci, dipilih)}
          indukKode={indukKode ?? null}
          bermasalah={Boolean(galat)}
        />
      );

    case 'textarea':
      return (
        <EditorKaya
          id={id}
          nilai={typeof isi === 'string' ? isi : null}
          onUbah={(html) => onUbah(kolom.kunci, html)}
          label={kolom.label}
          placeholder={kolom.placeholder ?? undefined}
          galat={Boolean(galat)}
        />
      );

    default:
      return (
        <input
          id={id}
          type="text"
          value={typeof isi === 'string' ? isi : ''}
          onChange={(e) => onUbah(kolom.kunci, e.target.value || null)}
          placeholder={kolom.placeholder ?? undefined}
          aria-label={kolom.label}
          aria-invalid={Boolean(galat)}
          className={cn(
            'field field-sm',
            kolom.tampilan === 'kode' && 'font-mono uppercase',
            galat && 'border-danger',
          )}
        />
      );
  }
}

/** Tampilan nilai untuk mode baca saja. */
function tampilkanNilai(kolom: KolomTemplate, isi: NilaiSel | undefined): string {
  if (isi === null || isi === undefined || isi === '') return '—';

  // Kolom master menyimpan salinan `{kode, nama}`; bentuk lama berupa string
  // biasa tetap terbaca lewat `nilaiMaster`.
  if (kolom.tipe === 'master') return nilaiMaster(isi)?.nama ?? '—';

  if (kolom.tipe === 'multiselect') {
    const daftar = Array.isArray(isi) ? isi : [isi];

    return daftar
      .map((satu) => kolom.pilihan?.find((p) => p.nilai === satu)?.label ?? String(satu))
      .join(', ');
  }

  if (kolom.tipe === 'boolean') return isi === true ? 'Ya' : 'Tidak';

  if (kolom.tipe === 'select') {
    return kolom.pilihan?.find((p) => p.nilai === isi)?.label ?? String(isi);
  }

  // Angka dibaca dengan pemisah Indonesia, sama seperti saat diisi — kalau
  // tidak, nilai yang sama tampil berbeda antara mode isi dan mode baca.
  if (typeof isi === 'number' && TIPE_ANGKA.includes(kolom.tipe)) {
    return formatAngka(isi, kolom.tipe === 'integer' ? 0 : (kolom.desimal ?? 2));
  }

  return String(isi);
}
