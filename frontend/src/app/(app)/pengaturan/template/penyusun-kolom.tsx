'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Undo2 } from 'lucide-react';

import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import {
  LABEL_TIPE,
  TAMPILAN,
  TIPE_ANGKA,
  type OpsiPenyusunKolom,
  type TipeKolom,
} from '@/lib/template';
import { PenyusunRumus } from './penyusun-rumus';

/** Daftar master seperlunya untuk penyusun kolom. */
export interface RingkasanJenisMaster {
  id: number;
  nama: string;
  induk_id: number | null;
}

export interface DraftKolom {
  /**
   * Penanda baris yang bertahan lintas render.
   *
   * Bukan `id` dari server — kolom yang belum tersimpan belum punya. Indeks
   * array tidak dapat dipakai: begitu kolom dipindah atau dihapus, indeksnya
   * berubah, sedangkan kolom yang sedang dibuka di panel kanan harus tetap
   * kolom yang sama. Tidak pernah ikut terkirim ke server.
   */
  uid: string;
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
  total: boolean;
  master_type_id: string;
  master_induk_key: string;
  beku: boolean;
  tampilan: string;
  placeholder: string;
  /** Disimpan sebagai teks supaya isian yang belum lengkap tidak runtuh. */
  min_value: string;
  max_value: string;
  desimal: string;
}

/** Penanda acak untuk kolom baru; `randomUUID` tidak ada di peramban lama. */
export function uidBaru(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k${Math.random().toString(36).slice(2)}`;
}

export const KOLOM_KOSONG: DraftKolom = {
  uid: '',
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
  total: false,
  master_type_id: '',
  master_induk_key: '',
  beku: false,
  tampilan: '',
  placeholder: '',
  min_value: '',
  max_value: '',
  desimal: '',
};

/**
 * Radix Select tidak menerima string kosong sebagai nilai item, sehingga
 * pilihan "tidak disaring" memakai penanda tersendiri.
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
  /** Daftar master yang dapat menjadi sumber pilihan sebuah kolom. */
  jenisMaster: RingkasanJenisMaster[];
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
export function PenyusunKolom({
  kolom,
  onUbah,
  opsi,
  jenisMaster,
  galatKolom,
}: PenyusunKolomProps) {
  const [terpilih, setTerpilih] = useState(0);
  /*
   * Menghapus kolom memakai pemberitahuan yang dapat dibatalkan, bukan dialog
   * konfirmasi — menghapus kolom sering dilakukan dan sering benar, dan dialog
   * pada tindakan sesering itu memperlambat pemakaian yang paling umum
   * (docs/standar-ui-ux.md §12.4). Barisnya dikembalikan ke posisi semula.
   */
  const [terhapus, setTerhapus] = useState<{ kolom: DraftKolom; index: number } | null>(null);

  function hapus(index: number) {
    setTerhapus({ kolom: kolom[index], index });
    onUbah(kolom.filter((_, i) => i !== index));
    setTerpilih((s) => (s >= index && s > 0 ? s - 1 : s));
  }

  function batalkanHapus() {
    if (terhapus === null) return;

    const salinan = [...kolom];
    salinan.splice(terhapus.index, 0, terhapus.kolom);
    onUbah(salinan);
    setTerpilih(terhapus.index);
    setTerhapus(null);
  }

  function ubahSatu(index: number, perubahan: Partial<DraftKolom>) {
    onUbah(kolom.map((item, i) => (i === index ? { ...item, ...perubahan } : item)));
  }

  /** Jenis induk sebuah daftar master, bila daftarnya berinduk. */
  function indukDari(idJenis: string) {
    const jenis = jenisMaster.find((satu) => String(satu.id) === idJenis);
    if (!jenis?.induk_id) return null;

    return jenisMaster.find((satu) => satu.id === jenis.induk_id) ?? null;
  }

  /**
   * Kolom yang dapat menyaring kolom ke-`index`.
   *
   * Hanya kolom master pada template yang sama yang mengambil pilihannya dari
   * daftar induk. Aturan yang sama ditegakkan server; di sini supaya pilihan
   * yang pasti ditolak tidak pernah sempat ditawarkan.
   */
  function penyaringUntuk(index: number, idJenis: string) {
    const induk = indukDari(idJenis);
    if (induk === null) return [];

    return kolom
      .map((item, i) => ({ item, i }))
      .filter(
        ({ item, i }) =>
          i !== index
          && item.type === 'master'
          && item.master_type_id === String(induk.id)
          && item.key !== ''
          && item.label !== '',
      )
      .map(({ item }) => ({ nilai: item.key, label: item.label }));
  }

  /**
   * Kolom yang boleh dirujuk rumus milik kolom ke-`index`.
   *
   * Kolom angka lain yang sudah punya kunci dan label, tanpa dirinya sendiri —
   * aturan yang sama dengan `ReportTemplateRequest::withValidator()`, kini
   * ditegakkan juga di layar sehingga rumus yang mustahil tidak pernah sempat
   * tersusun.
   */
  function rujukanUntuk(index: number) {
    return kolom
      .map((item, i) => ({ item, i }))
      .filter(
        ({ item, i }) =>
          i !== index && TIPE_ANGKA.includes(item.type) && item.key !== '' && item.label !== '',
      )
      .map(({ item }) => ({ kunci: item.key, label: item.label }));
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

    // Pilihan mengikuti kolomnya, bukan posisinya.
    setTerpilih((s) => (s === index ? tujuan : s === tujuan ? index : s));
  }

  function galat(index: number, nama: string): string | undefined {
    return galatKolom[`fields.${index}.${nama}`]?.[0];
  }

  const indexTerpilih = Math.min(Math.max(terpilih, 0), kolom.length - 1);

  /**
   * Isian lengkap satu kolom.
   *
   * Isinya tidak berubah sedikit pun dari bentuk sebelumnya; yang berubah hanya
   * berapa banyak yang dirender sekaligus. Dulu seluruh kolom terbuka penuh
   * bersamaan — 27 kolom pada template Produksi berarti belasan ribu piksel
   * gulungan, dan mencari satu kolom berarti menggulir melewati semuanya.
   */
  function editorKolom(item: DraftKolom, index: number) {
    const bertipeAngka = TIPE_ANGKA.includes(item.type);

    return (
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

            {item.type === 'master' && (
              <>
                <Select
                  id={`daftar-${index}`}
                  label="Ambil pilihan dari daftar"
                  ukuran="sm"
                  placeholder="Pilih daftar master..."
                  nilai={item.master_type_id}
                  opsi={jenisMaster.map((satu) => ({
                    nilai: String(satu.id),
                    label: satu.nama,
                  }))}
                  onUbah={(nilai) =>
                    // Kolom penyaring ikut dilepas: daftar barunya belum tentu
                    // berinduk pada daftar yang sama.
                    ubahSatu(index, { master_type_id: nilai, master_induk_key: '' })
                  }
                  wajib
                  galat={galat(index, 'master_type_id')}
                />

                {/*
                  Pemilih penyaring hanya muncul bila daftarnya memang
                  berinduk. Menawarkannya pada daftar yang tidak berinduk
                  berarti menawarkan pengaturan yang pasti ditolak.
                */}
                {indukDari(item.master_type_id) !== null && (
                  <Select
                    id={`penyaring-${index}`}
                    label="Disaring oleh kolom"
                    ukuran="sm"
                    nilai={item.master_induk_key || TANPA_MASTER}
                    opsi={[
                      { nilai: TANPA_MASTER, label: 'Tidak disaring' },
                      ...penyaringUntuk(index, item.master_type_id),
                    ]}
                    onUbah={(nilai) =>
                      ubahSatu(index, {
                        master_induk_key: nilai === TANPA_MASTER ? '' : nilai,
                      })
                    }
                    bantuan={`Memilih ${indukDari(item.master_type_id)?.nama ?? 'induk'} pada kolom itu akan mempersempit pilihan di sini.`}
                    galat={galat(index, 'master_induk_key')}
                  />
                )}
              </>
            )}

            {/*
              Variasi tampilan hanya ditawarkan untuk tipe yang memang punya
              lebih dari satu. Menampilkannya dalam keadaan mati akan
              menawarkan pengaturan yang tidak mengubah apa pun.
            */}
            {(TAMPILAN[item.type]?.length ?? 0) > 1 && (
              <Select
                id={`tampilan-${index}`}
                label="Tampilan saat diisi"
                ukuran="sm"
                nilai={item.tampilan || (TAMPILAN[item.type]?.[0].nilai ?? '')}
                opsi={TAMPILAN[item.type] ?? []}
                onUbah={(nilai) => ubahSatu(index, { tampilan: nilai })}
              />
            )}

            {(item.type === 'select' || item.type === 'multiselect') && (
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

                <div className="sm:col-span-2">
                  <PenyusunRumus
                    id={`rumus-${index}`}
                    nilai={item.computed_from}
                    onUbah={(rumus) => ubahSatu(index, { computed_from: rumus })}
                    rujukan={rujukanUntuk(index)}
                    galat={galat(index, 'computed_from')}
                  />
                  <span className="mt-1 block text-caption text-ink-soft">
                    Kolom ini akan terkunci saat pengisian.
                  </span>
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

            <label className="flex w-fit items-center gap-2 text-body text-ink-muted sm:col-span-2">
              <input
                type="checkbox"
                checked={item.beku}
                onChange={(e) => ubahSatu(index, { beku: e.target.checked })}
                className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
              />
              Tetap terlihat saat digulir
            </label>
            <span className="text-caption text-ink-soft sm:col-span-2">
              Berlaku untuk paling banyak dua kolom pertama. Kolom identitas yang tetap
              terlihat membuat pengisi tidak kehilangan jejak baris saat menggulir ke kanan.
            </span>

            {bertipeAngka && (
              <>
                <label className="flex w-fit items-center gap-2 text-body text-ink-muted sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={item.total}
                    onChange={(e) => ubahSatu(index, { total: e.target.checked })}
                    className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                  />
                  Tampilkan baris total (jumlah ke bawah)
                </label>
                <span className="text-caption text-ink-soft sm:col-span-2">
                  Menjumlahkan seluruh baris kolom ini di baris Total — pada pengisian,
                  tampilan laporan, dan export.
                </span>
              </>
            )}
          </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      {/*
        Panel kiri: daftar ringkas yang menggulir sendiri. Tingginya sengaja
        bukan kelipatan pas tinggi baris supaya baris terakhir terpotong
        sebagian — batang gulir tersembunyi saat diam, jadi potongan itulah
        petunjuk masih ada isi di bawah (docs/standar-ui-ux.md §6.1).
      */}
      <div className="flex max-h-[29rem] flex-col rounded-card border border-line bg-surface">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-2.5 py-2">
          <span className="text-caption font-semibold text-ink-soft">
            Kolom ({kolom.length})
          </span>
          <button
            type="button"
            onClick={() => {
              onUbah([...kolom, { ...KOLOM_KOSONG, uid: uidBaru() }]);
              setTerpilih(kolom.length);
            }}
            aria-label="Tambah kolom"
            title="Tambah kolom"
            className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {kolom.map((item, index) => {
            const bermasalah = Object.keys(galatKolom).some((kunci) =>
              kunci.startsWith(`fields.${index}.`),
            );

            return (
              <li key={item.uid} className="flex items-center gap-0.5 px-1">
                <button
                  type="button"
                  onClick={() => setTerpilih(index)}
                  aria-current={index === indexTerpilih}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 py-1.5 text-left transition-colors duration-fast',
                    index === indexTerpilih
                      ? 'bg-primary-soft text-primary-text'
                      : 'text-ink hover:bg-surface-muted',
                  )}
                >
                  <span className="w-4 shrink-0 text-caption tabular-nums text-ink-soft">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">
                      {item.label.trim() || 'Kolom baru'}
                      {item.is_required && <span className="text-danger"> *</span>}
                    </span>
                    <span className="block truncate text-caption text-ink-soft">
                      {LABEL_TIPE[item.type]}
                      {item.unit.trim() && ` (${item.unit.trim()})`}
                    </span>
                  </span>
                  {bermasalah && (
                    <span
                      aria-label="Kolom ini bermasalah"
                      className="size-1.5 shrink-0 rounded-full bg-danger"
                    />
                  )}
                </button>

                <span className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => pindah(index, -1)}
                    disabled={index === 0}
                    aria-label={`Naikkan kolom ${index + 1}`}
                    className="grid size-6 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted disabled:opacity-30"
                  >
                    <ChevronUp aria-hidden="true" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => pindah(index, 1)}
                    disabled={index === kolom.length - 1}
                    aria-label={`Turunkan kolom ${index + 1}`}
                    className="grid size-6 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted disabled:opacity-30"
                  >
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => hapus(index)}
                    disabled={kolom.length === 1}
                    aria-label={`Hapus kolom ${index + 1}`}
                    className="grid size-6 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text disabled:opacity-30"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>

        {terhapus && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-2.5 py-1.5">
            <span className="min-w-0 truncate text-caption text-ink-muted">
              {terhapus.kolom.label.trim() || 'Kolom'} dihapus
            </span>
            <button
              type="button"
              onClick={batalkanHapus}
              className="btn-ghost btn-sm shrink-0"
            >
              <Undo2 aria-hidden="true" className="size-3.5" />
              Batalkan
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-card border border-line bg-surface p-3">
        <p className="mb-2 text-caption font-semibold text-ink-soft">
          Kolom {indexTerpilih + 1} dari {kolom.length}
        </p>
        {kolom[indexTerpilih] && editorKolom(kolom[indexTerpilih], indexTerpilih)}
      </div>
    </div>
  );
}