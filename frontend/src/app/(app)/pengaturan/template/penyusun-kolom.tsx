'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { LABEL_TIPE, TIPE_ANGKA, type OpsiPenyusunKolom, type TipeKolom } from '@/lib/template';

export interface DraftKolom {
  key: string;
  label: string;
  group_label: string;
  type: TipeKolom;
  is_required: boolean;
  unit: string;
  help_text: string;
  /** Ditulis sebagai teks dipisah koma agar mudah disunting. */
  options: string;
  lookup_source: string;
  computed_from: string;
  placeholder: string;
  /** Disimpan sebagai teks supaya isian yang belum lengkap tidak runtuh. */
  min_value: string;
  max_value: string;
  desimal: string;
}

export const KOLOM_KOSONG: DraftKolom = {
  key: '',
  label: '',
  group_label: '',
  type: 'text',
  is_required: false,
  unit: '',
  help_text: '',
  options: '',
  lookup_source: '',
  computed_from: '',
  placeholder: '',
  min_value: '',
  max_value: '',
  desimal: '',
};

/**
 * Radix Select tidak menerima string kosong sebagai nilai item, sehingga
 * pilihan "tanpa master data" memakai penanda tersendiri.
 */
const TANPA_MASTER = '__tanpa__';

/** Menurunkan kunci dari label agar administrator tidak perlu mengetiknya. */
export function kunciDariLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'k$1')
    .slice(0, 64);
}

interface PenyusunKolomProps {
  kolom: DraftKolom[];
  onUbah: (kolom: DraftKolom[]) => void;
  opsi: OpsiPenyusunKolom;
  galatKolom: Record<string, string[]>;
}

/**
 * Penyusun daftar kolom template.
 *
 * Kunci kolom terisi otomatis dari label selama administrator belum
 * mengubahnya sendiri (standar interaksi §1.2) — kunci itu penanda teknis yang
 * tidak perlu dipikirkan saat menyusun.
 *
 * Satuan hanya muncul untuk kolom angka, daftar pilihan hanya untuk kolom
 * Pilihan. Kolom yang tidak berlaku disembunyikan, bukan ditampilkan dalam
 * keadaan mati.
 */
export function PenyusunKolom({ kolom, onUbah, opsi, galatKolom }: PenyusunKolomProps) {
  function ubahSatu(index: number, perubahan: Partial<DraftKolom>) {
    onUbah(kolom.map((item, i) => (i === index ? { ...item, ...perubahan } : item)));
  }

  function ubahLabel(index: number, label: string) {
    const sekarang = kolom[index];
    // Kunci ikut berubah selama masih sinkron dengan label sebelumnya.
    const kunciMasihOtomatis =
      sekarang.key === '' || sekarang.key === kunciDariLabel(sekarang.label);

    ubahSatu(index, {
      label,
      ...(kunciMasihOtomatis ? { key: kunciDariLabel(label) } : {}),
    });
  }

  function pindah(index: number, arah: -1 | 1) {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= kolom.length) return;

    const salinan = [...kolom];
    [salinan[index], salinan[tujuan]] = [salinan[tujuan], salinan[index]];
    onUbah(salinan);
  }

  function galat(index: number, nama: string): string | undefined {
    return galatKolom[`fields.${index}.${nama}`]?.[0];
  }

  return (
    <div className="space-y-2">
      {kolom.map((item, index) => {
        const bertipeAngka = TIPE_ANGKA.includes(item.type);

        return (
          <div key={index} className="rounded-card border border-line bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-caption font-semibold text-ink-soft">Kolom {index + 1}</span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => pindah(index, -1)}
                  disabled={index === 0}
                  aria-label={`Naikkan kolom ${index + 1}`}
                  className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted disabled:opacity-30"
                >
                  <ChevronUp aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => pindah(index, 1)}
                  disabled={index === kolom.length - 1}
                  aria-label={`Turunkan kolom ${index + 1}`}
                  className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted disabled:opacity-30"
                >
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUbah(kolom.filter((_, i) => i !== index))}
                  disabled={kolom.length === 1}
                  aria-label={`Hapus kolom ${index + 1}`}
                  className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text disabled:opacity-30"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`label-${index}`} className="field-label">
                  Label yang dilihat pengguna
                </label>
                <input
                  id={`label-${index}`}
                  value={item.label}
                  onChange={(e) => ubahLabel(index, e.target.value)}
                  className="field field-sm"
                  required
                />
                {galat(index, 'label') && (
                  <span className="field-error">{galat(index, 'label')}</span>
                )}
              </div>

              <Select
                id={`tipe-${index}`}
                label="Tipe isian"
                ukuran="sm"
                nilai={item.type}
                opsi={opsi.tipe.map((t) => ({
                  nilai: t.nilai,
                  label: LABEL_TIPE[t.nilai] ?? t.label,
                }))}
                onUbah={(nilai) => ubahSatu(index, { type: nilai as TipeKolom })}
              />

              <div>
                <label htmlFor={`grup-${index}`} className="field-label">
                  Grup kolom
                </label>
                <input
                  id={`grup-${index}`}
                  value={item.group_label}
                  onChange={(e) => ubahSatu(index, { group_label: e.target.value })}
                  placeholder="Mis. Oven, Ayak, Packing"
                  className="field field-sm"
                />
                <span className="mt-1 block text-caption text-ink-soft">
                  Kolom yang segrup ditampilkan di bawah satu header bersama.
                </span>
              </div>

              <Select
                id={`sumber-${index}`}
                label="Ambil pilihan dari master data"
                ukuran="sm"
                nilai={item.lookup_source || TANPA_MASTER}
                opsi={[
                  { nilai: TANPA_MASTER, label: 'Tidak, ketik manual' },
                  ...opsi.sumber_master,
                ]}
                onUbah={(nilai) =>
                  ubahSatu(index, { lookup_source: nilai === TANPA_MASTER ? '' : nilai })
                }
              />

              {item.type === 'select' && (
                <div className="sm:col-span-2">
                  <label htmlFor={`pilihan-${index}`} className="field-label">
                    Daftar pilihan
                  </label>
                  <input
                    id={`pilihan-${index}`}
                    value={item.options}
                    onChange={(e) => ubahSatu(index, { options: e.target.value })}
                    placeholder="Belum Mulai, Dalam Proses, Selesai"
                    className="field field-sm"
                  />
                  <span className="mt-1 block text-caption text-ink-soft">
                    Pisahkan dengan koma.
                  </span>
                  {galat(index, 'options') && (
                    <span className="field-error">{galat(index, 'options')}</span>
                  )}
                </div>
              )}

              {bertipeAngka && (
                <>
                  <div>
                    <label htmlFor={`satuan-${index}`} className="field-label">
                      Satuan
                    </label>
                    <input
                      id={`satuan-${index}`}
                      value={item.unit}
                      onChange={(e) => ubahSatu(index, { unit: e.target.value })}
                      placeholder="kg, box, %"
                      className="field field-sm"
                    />
                    {galat(index, 'unit') && (
                      <span className="field-error">{galat(index, 'unit')}</span>
                    )}
                  </div>

                  {item.type === 'decimal' && (
                    <div>
                      <label htmlFor={`desimal-${index}`} className="field-label">
                        Angka di belakang koma
                      </label>
                      <Select
                        id={`desimal-${index}`}
                        nilai={item.desimal || '2'}
                        onUbah={(nilai) => ubahSatu(index, { desimal: nilai })}
                        ukuran="sm"
                        opsi={[
                          { nilai: '0', label: 'Tanpa koma — 12' },
                          { nilai: '1', label: 'Satu — 12,5' },
                          { nilai: '2', label: 'Dua — 12,75' },
                          { nilai: '3', label: 'Tiga — 12,750' },
                          { nilai: '4', label: 'Empat — 12,7500' },
                        ]}
                      />
                      {galat(index, 'desimal') && (
                        <span className="field-error">{galat(index, 'desimal')}</span>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor={`min-${index}`} className="field-label">
                      Nilai terkecil
                    </label>
                    <input
                      id={`min-${index}`}
                      value={item.min_value}
                      onChange={(e) => ubahSatu(index, { min_value: e.target.value })}
                      placeholder="Kosongkan bila bebas"
                      className="field field-sm"
                    />
                    {galat(index, 'min_value') && (
                      <span className="field-error">{galat(index, 'min_value')}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`maks-${index}`} className="field-label">
                      Nilai terbesar
                    </label>
                    <input
                      id={`maks-${index}`}
                      value={item.max_value}
                      onChange={(e) => ubahSatu(index, { max_value: e.target.value })}
                      placeholder="Kosongkan bila bebas"
                      className="field field-sm"
                    />
                    {galat(index, 'max_value') && (
                      <span className="field-error">{galat(index, 'max_value')}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`rumus-${index}`} className="field-label">
                      Dihitung otomatis dari
                    </label>
                    <input
                      id={`rumus-${index}`}
                      value={item.computed_from}
                      onChange={(e) => ubahSatu(index, { computed_from: e.target.value })}
                      placeholder="qty_masuk - qty_keluar"
                      className={cn('field field-sm font-mono')}
                    />
                    <span className="mt-1 block text-caption text-ink-soft">
                      Pakai kunci kolom lain. Kolom ini akan terkunci saat pengisian.
                    </span>
                    {galat(index, 'computed_from') && (
                      <span className="field-error">{galat(index, 'computed_from')}</span>
                    )}
                  </div>
                </>
              )}

              <div>
                <label htmlFor={`contoh-${index}`} className="field-label">
                  Teks contoh
                </label>
                <input
                  id={`contoh-${index}`}
                  value={item.placeholder}
                  onChange={(e) => ubahSatu(index, { placeholder: e.target.value })}
                  placeholder="Tampil samar saat isian kosong"
                  className="field field-sm"
                />
                {galat(index, 'placeholder') && (
                  <span className="field-error">{galat(index, 'placeholder')}</span>
                )}
              </div>

              <div>
                <label htmlFor={`bantuan-${index}`} className="field-label">
                  Teks bantuan
                </label>
                <input
                  id={`bantuan-${index}`}
                  value={item.help_text}
                  onChange={(e) => ubahSatu(index, { help_text: e.target.value })}
                  placeholder="Penjelasan singkat untuk pengisi"
                  className="field field-sm"
                />
                {galat(index, 'help_text') && (
                  <span className="field-error">{galat(index, 'help_text')}</span>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={`kunci-${index}`} className="field-label">
                  Kunci data
                </label>
                <input
                  id={`kunci-${index}`}
                  value={item.key}
                  onChange={(e) => ubahSatu(index, { key: e.target.value })}
                  className="field field-sm font-mono"
                  required
                />
                <span className="mt-1 block text-caption text-ink-soft">
                  Terisi otomatis dari label. Dipakai sistem menyimpan nilai — tidak pernah
                  tampil ke pengguna, dan sebaiknya tidak diubah setelah template dipakai.
                </span>
                {galat(index, 'key') && <span className="field-error">{galat(index, 'key')}</span>}
              </div>

              <label className="flex w-fit items-center gap-2 text-body text-ink-muted sm:col-span-2">
                <input
                  type="checkbox"
                  checked={item.is_required}
                  onChange={(e) => ubahSatu(index, { is_required: e.target.checked })}
                  className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                />
                Wajib diisi
              </label>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onUbah([...kolom, { ...KOLOM_KOSONG }])}
        className="btn-ghost btn-sm w-full border border-dashed border-line"
      >
        <Plus aria-hidden="true" className="size-4" />
        Tambah Kolom
      </button>
    </div>
  );
}
