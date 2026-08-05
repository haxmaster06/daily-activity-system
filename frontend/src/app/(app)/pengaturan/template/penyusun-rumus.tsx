'use client';

import { Delete, Pencil, SquareStack } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import { hitungPratinjau } from '@/lib/laporan';

/** Kolom yang boleh dirujuk sebuah rumus. */
export interface KolomRujukan {
  kunci: string;
  label: string;
}

interface Props {
  id: string;
  nilai: string;
  onUbah: (rumus: string) => void;
  /** Kolom angka lain pada template yang sama, tanpa kolom ini sendiri. */
  rujukan: KolomRujukan[];
  galat?: string;
}

const OPERATOR = [
  { token: '+', label: '+' },
  { token: '-', label: '−' },
  { token: '*', label: '×' },
  { token: '/', label: '÷' },
  { token: '(', label: '(' },
  { token: ')', label: ')' },
] as const;

/** Angka contoh untuk pratinjau — berbeda tiap kolom agar salah rujuk terlihat. */
const CONTOH = [120, 45, 8, 30, 6, 15, 90, 3];

/**
 * Desimal secukupnya, paling banyak tiga.
 *
 * `formatAngka` selalu menampilkan sebanyak yang diminta, sehingga hasil bulat
 * 75 akan tampil `75,000` — angka yang terbaca seolah punya ketelitian yang
 * tidak dimilikinya.
 */
function desimalSecukupnya(nilai: number): number {
  const pecahan = String(nilai).split('.')[1];

  return Math.min(pecahan?.length ?? 0, 3);
}

/**
 * Memecah rumus menjadi token yang dapat ditampilkan sebagai chip.
 *
 * Pemisahnya sama persis dengan `hitungPratinjau` di frontend dan
 * `App\Support\Rumus::pisahkan()` di backend. Kalau ketiganya berbeda, rumus
 * yang tampil benar di layar bisa gagal dihitung saat laporan disimpan.
 */
export function pecahRumus(rumus: string): string[] {
  return rumus.match(/[a-z_][a-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/gi) ?? [];
}

/** Kurung berpasangan dan rumus dapat dihitung sampai satu nilai. */
export function rumusSah(rumus: string, rujukan: KolomRujukan[]): boolean {
  const token = pecahRumus(rumus);
  if (token.length === 0) return false;

  const dikenal = new Set(rujukan.map((r) => r.kunci));

  for (const item of token) {
    if (/^[a-z_]/i.test(item) && !dikenal.has(item)) return false;
  }

  // Diuji dengan angka yang tidak nol supaya pembagian nol tidak disalahartikan
  // sebagai rumus rusak.
  const contoh: Record<string, number> = {};
  rujukan.forEach((r, i) => {
    contoh[r.kunci] = CONTOH[i % CONTOH.length];
  });

  return hitungPratinjau(rumus, contoh) !== null;
}

/**
 * Menyusun rumus kolom dengan klik, bukan ketikan.
 *
 * Sebelumnya rumus diketik bebas sebagai `qty_masuk - qty_keluar`. Itu meminta
 * administrator menghafal dan mengetik ulang **kunci kolom** — padahal
 * `docs/standar-ui-ux.md` §1.3 menyatakan kunci tidak pernah diketik pengguna,
 * dan di layar yang sama kunci itu memang sudah dibuat otomatis dari label.
 * Satu huruf meleset menghasilkan rumus yang tersimpan tanpa keluhan lalu
 * menghitung nol diam-diam saat laporan diisi.
 *
 * Yang disimpan tetap string `computed_from` yang sama, sehingga template lama
 * terus berfungsi dan backend tidak perlu berubah sedikit pun. Yang berubah
 * hanya cara menyusunnya.
 *
 * Chip menampilkan **label** kolom, bukan kuncinya (§1.4 melarang nama kolom
 * basis data tampil ke layar); yang tersimpan tetap kuncinya.
 */
export function PenyusunRumus({ id, nilai, onUbah, rujukan, galat }: Props) {
  const [manual, setManual] = useState(false);

  const token = useMemo(() => pecahRumus(nilai), [nilai]);
  const labelKolom = useMemo(
    () => new Map(rujukan.map((r) => [r.kunci, r.label])),
    [rujukan],
  );

  const contoh = useMemo(() => {
    const isi: Record<string, number> = {};
    rujukan.forEach((r, i) => {
      isi[r.kunci] = CONTOH[i % CONTOH.length];
    });

    return isi;
  }, [rujukan]);

  const hasil = nilai.trim() === '' ? null : hitungPratinjau(nilai, contoh);
  const dipakai = rujukan.filter((r) => token.includes(r.kunci));

  function tambah(bagian: string) {
    onUbah(nilai.trim() === '' ? bagian : `${nilai.trim()} ${bagian}`);
  }

  function hapusTerakhir() {
    onUbah(token.slice(0, -1).join(' '));
  }

  if (manual) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="field-label">
            Dihitung otomatis dari
          </label>
          <button
            type="button"
            onClick={() => setManual(false)}
            className="btn-ghost btn-sm gap-1 text-caption"
          >
            <SquareStack aria-hidden="true" className="size-3.5" />
            Susun dengan klik
          </button>
        </div>
        <input
          id={id}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          placeholder="qty_masuk - qty_keluar"
          className="field field-sm font-mono"
        />
        <span className="mt-1 block text-caption text-ink-soft">
          Memakai kunci kolom. Salah ketik di sini tidak akan ketahuan sampai laporan diisi.
        </span>
        {galat && <span className="field-error">{galat}</span>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="field-label" id={`${id}-label`}>
          Dihitung otomatis dari
        </span>
        <button
          type="button"
          onClick={() => setManual(true)}
          className="btn-ghost btn-sm gap-1 text-caption"
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          Tulis manual
        </button>
      </div>

      {/* Rumus yang sedang tersusun */}
      <div
        aria-labelledby={`${id}-label`}
        aria-live="polite"
        className={cn(
          'flex min-h-input flex-wrap items-center gap-1 rounded-input border border-line',
          'bg-surface px-2 py-1.5',
          galat && 'border-danger',
        )}
      >
        {token.length === 0 ? (
          <span className="text-caption text-ink-soft">
            Pilih kolom dan operator di bawah.
          </span>
        ) : (
          token.map((item, urutan) => {
            const label = labelKolom.get(item);

            return (
              <span
                key={`${item}-${urutan}`}
                className={cn(
                  'rounded-control px-1.5 py-0.5 text-caption',
                  label
                    ? 'bg-primary/10 text-primary'
                    : /^[a-z_]/i.test(item)
                      ? // Kolom yang tidak dikenal — biasanya sisa rumus lama
                        // yang kolomnya sudah dihapus atau diubah namanya.
                        'bg-danger/10 text-danger'
                      : 'bg-surface-muted text-ink-muted',
                )}
              >
                {label ?? (OPERATOR.find((o) => o.token === item)?.label ?? item)}
              </span>
            );
          })
        )}

        {token.length > 0 && (
          <button
            type="button"
            onClick={hapusTerakhir}
            aria-label="Hapus bagian terakhir"
            className="btn-ghost ml-auto size-7 shrink-0 p-0"
          >
            <Delete aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      {/* Kolom yang dapat dirujuk */}
      {rujukan.length === 0 ? (
        <span className="mt-1 block text-caption text-ink-soft">
          Belum ada kolom angka lain yang dapat dihitung.
        </span>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {rujukan.map((r) => (
            <button
              key={r.kunci}
              type="button"
              onClick={() => tambah(r.kunci)}
              className="btn-ghost btn-sm border border-line text-caption"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap gap-1">
        {OPERATOR.map((o) => (
          <button
            key={o.token}
            type="button"
            onClick={() => tambah(o.token)}
            aria-label={`Tambah ${o.label}`}
            className="btn-ghost btn-sm w-8 border border-line font-mono"
          >
            {o.label}
          </button>
        ))}
      </div>

      {/*
        Pratinjau memakai angka contoh. Ini yang membuat rumus salah terlihat
        sebelum disimpan, bukan setelah laporan pertama diisi.
      */}
      {token.length > 0 && (
        <p className="mt-1.5 text-caption text-ink-soft">
          {hasil === null ? (
            <span className="text-danger">
              Rumus belum lengkap — periksa kurung dan operatornya.
            </span>
          ) : (
            <>
              Contoh:{' '}
              {dipakai.map((r) => `${r.label} ${formatAngka(contoh[r.kunci])}`).join(', ')}
              {dipakai.length > 0 && ' → '}
              <span className="font-medium text-ink">
                {formatAngka(hasil, desimalSecukupnya(hasil))}
              </span>
            </>
          )}
        </p>
      )}

      {galat && <span className="field-error">{galat}</span>}
    </div>
  );
}
