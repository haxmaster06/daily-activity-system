'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Wizard } from '@/components/ui/wizard';
import type { Departemen } from '@/lib/master-data';
import type { OpsiPenyusunKolom, Template, TipeKolom } from '@/lib/template';
import { LABEL_TIPE, TIPE_ANGKA } from '@/lib/template';
import { buatTemplate, perbaruiTemplate, type KiriKolom } from './actions';
import {
  KOLOM_KOSONG,
  kunciDariLabel,
  PenyusunKolom,
  type DraftKolom,
  type RingkasanJenisMaster,
} from './penyusun-kolom';
import { rumusSah } from './penyusun-rumus';

interface TemplateWizardProps {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti membuat template baru. */
  template: Template | null;
  departemen: Departemen[];
  opsi: OpsiPenyusunKolom;
  jenisMaster: RingkasanJenisMaster[];
}

const bertipeAngka = (tipe: TipeKolom): boolean => TIPE_ANGKA.includes(tipe);

/** Isian kosong berarti "tidak diatur", bukan nol. */
function angkaAtauNull(teks: string): number | null {
  const bersih = teks.trim();
  if (bersih === '') return null;

  const angka = Number(bersih.replace(',', '.'));

  return Number.isFinite(angka) ? angka : null;
}

interface Identitas {
  name: string;
  description: string;
  department_id: string;
  is_active: boolean;
}

/** Radix Select tidak menerima string kosong sebagai nilai item. */
const SEMUA_DEPARTEMEN = '__semua__';

const IDENTITAS_KOSONG: Identitas = {
  name: '',
  description: '',
  department_id: '',
  is_active: true,
};

/**
 * Wizard penyusun template (standar interaksi §3).
 *
 * Isian template saling berantai — kolom baru masuk akal disusun setelah
 * identitas templatenya jelas, dan tinjauan akhir hanya berguna setelah
 * keduanya terisi. Karena itu wizard, bukan satu form panjang.
 */
export function TemplateWizard({
  terbuka,
  onTutup,
  template,
  departemen,
  opsi,
  jenisMaster,
}: TemplateWizardProps) {
  const router = useRouter();
  const sedangUbah = template !== null;

  const [identitas, setIdentitas] = useState<Identitas>(IDENTITAS_KOSONG);
  const [kolom, setKolom] = useState<DraftKolom[]>([{ ...KOLOM_KOSONG }]);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!terbuka) return;

    setGalat(null);
    setGalatKolom({});

    if (template) {
      setIdentitas({
        name: template.nama,
        description: template.keterangan ?? '',
        department_id: String(template.departemen?.id ?? ''),
        is_active: template.aktif,
      });
      setKolom(
        (template.kolom ?? []).map((k) => ({
          key: k.kunci,
          label: k.label,
          group_label: k.grup ?? '',
          type: k.tipe,
          is_required: k.wajib,
          unit: k.satuan ?? '',
          help_text: k.bantuan ?? '',
          options: (k.pilihan ?? []).map((p) => p.label).join(', '),
          lookup_source: k.sumber_master ?? '',
          computed_from: k.rumus ?? '',
          placeholder: k.placeholder ?? '',
          master_type_id: k.master_jenis_id === null ? '' : String(k.master_jenis_id),
          master_induk_key: k.master_induk_kunci ?? '',
          beku: k.beku,
          min_value: k.nilai_min === null ? '' : String(k.nilai_min),
          max_value: k.nilai_maks === null ? '' : String(k.nilai_maks),
          desimal: k.desimal === null ? '' : String(k.desimal),
        })),
      );
    } else {
      setIdentitas(IDENTITAS_KOSONG);
      setKolom([{ ...KOLOM_KOSONG }]);
    }
  }, [terbuka, template]);

  function validasiIdentitas(): boolean {
    if (identitas.name.trim() === '') {
      setGalat('Nama template belum diisi.');
      return false;
    }
    setGalat(null);
    return true;
  }

  function validasiKolom(): boolean {
    if (kolom.length === 0) {
      setGalat('Template harus punya minimal satu kolom.');
      return false;
    }

    const kosong = kolom.findIndex((k) => k.label.trim() === '' || k.key.trim() === '');
    if (kosong !== -1) {
      setGalat(`Kolom ${kosong + 1} belum punya label atau kunci.`);
      return false;
    }

    const kunci = kolom.map((k) => k.key.trim());
    const ganda = kunci.find((k, i) => kunci.indexOf(k) !== i);
    if (ganda) {
      setGalat(`Kunci "${ganda}" dipakai lebih dari satu kolom.`);
      return false;
    }

    /*
     * Rumus diperiksa di sini, bukan menunggu balasan server. Rumus yang
     * kurungnya tidak berpasangan atau menyebut kolom yang sudah berganti nama
     * tersimpan tanpa keluhan lalu menghitung nol diam-diam saat laporan diisi.
     */
    const rumusRusak = kolom.findIndex((k, i) => {
      if (k.computed_from.trim() === '') return false;

      const rujukan = kolom
        .filter((lain, j) => j !== i && bertipeAngka(lain.type) && lain.key.trim() !== '')
        .map((lain) => ({ kunci: lain.key.trim(), label: lain.label.trim() }));

      return !rumusSah(k.computed_from, rujukan);
    });

    if (rumusRusak !== -1) {
      setGalat(
        `Rumus pada kolom ${rumusRusak + 1} belum lengkap atau menyebut kolom yang tidak ada.`,
      );

      return false;
    }

    setGalat(null);
    return true;
  }

  function keKiriman(): KiriKolom[] {
    return kolom.map((k) => ({
      key: k.key.trim(),
      label: k.label.trim(),
      group_label: k.group_label.trim() || null,
      type: k.type,
      is_required: k.is_required,
      unit: k.unit.trim() || null,
      help_text: k.help_text.trim() || null,
      options:
        k.type === 'select' && k.options.trim() !== ''
          ? k.options
              .split(',')
              .map((teks) => teks.trim())
              .filter(Boolean)
              .map((label) => ({ nilai: kunciDariLabel(label), label }))
          : null,
      lookup_source: k.lookup_source || null,
      computed_from: k.computed_from.trim() || null,
      placeholder: k.placeholder.trim() || null,
      // Batas dan angka pecahan hanya berarti pada kolom angka; dikirim null
      // untuk tipe lain supaya validasi backend tidak menolaknya.
      min_value: bertipeAngka(k.type) ? angkaAtauNull(k.min_value) : null,
      max_value: bertipeAngka(k.type) ? angkaAtauNull(k.max_value) : null,
      desimal: k.type === 'decimal' ? angkaAtauNull(k.desimal) : null,
      master_type_id: k.type === 'master' && k.master_type_id ? Number(k.master_type_id) : null,
      master_induk_key: k.type === 'master' ? k.master_induk_key || null : null,
      beku: k.beku,
    }));
  }

  async function simpan() {
    setGalat(null);
    setGalatKolom({});

    const muatan = {
      name: identitas.name.trim(),
      description: identitas.description.trim() || null,
      department_id: identitas.department_id ? Number(identitas.department_id) : null,
      is_active: identitas.is_active,
      fields: keKiriman(),
    };

    const hasil = sedangUbah
      ? await perbaruiTemplate(template.id, muatan)
      : await buatTemplate(muatan);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);
      setGalatKolom(hasil.errors ?? {});
      return;
    }

    onTutup();
    router.refresh();
  }

  const namaDepartemen =
    departemen.find((d) => String(d.id) === identitas.department_id)?.nama ??
    'Semua departemen';

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={sedangUbah ? 'Ubah Template' : 'Buat Template'}
      lebar="lebar"
      aksi={null}
    >
      {galat && <Alert jenis="galat" pesan={galat} className="mb-3" />}

      <Wizard
        onBatal={onTutup}
        onSelesai={simpan}
        labelSelesai={sedangUbah ? 'Simpan Perubahan' : 'Buat Template'}
        langkah={[
          {
            label: 'Identitas',
            validasi: validasiIdentitas,
            isi: (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="nama-template" className="field-label">
                    Nama Template
                  </label>
                  <input
                    id="nama-template"
                    value={identitas.name}
                    onChange={(e) => setIdentitas({ ...identitas, name: e.target.value })}
                    className="field"
                    required
                  />
                </div>

                {/*
                  Kode dibuat otomatis dari nama dan tidak pernah berubah
                  (docs/standar-ui-ux.md §1.5).
                */}
                {sedangUbah && (
                  <div className="rounded-input border border-line bg-surface-muted px-2.5 py-2">
                    <span className="block text-caption text-ink-soft">Kode</span>
                    <span className="block font-mono text-body-lg text-ink-muted">
                      {template.kode}
                    </span>
                  </div>
                )}

                <Select
                  id="departemen-template"
                  label="Departemen"
                  nilai={identitas.department_id || SEMUA_DEPARTEMEN}
                  opsi={[
                    { nilai: SEMUA_DEPARTEMEN, label: 'Semua departemen' },
                    ...departemen.map((d) => ({ nilai: String(d.id), label: d.nama })),
                  ]}
                  onUbah={(nilai) =>
                    setIdentitas({
                      ...identitas,
                      department_id: nilai === SEMUA_DEPARTEMEN ? '' : nilai,
                    })
                  }
                />

                <div className="sm:col-span-2">
                  <label htmlFor="keterangan-template" className="field-label">
                    Keterangan
                  </label>
                  <input
                    id="keterangan-template"
                    value={identitas.description}
                    onChange={(e) =>
                      setIdentitas({ ...identitas, description: e.target.value })
                    }
                    className="field"
                  />
                </div>

                <label className="flex w-fit items-center gap-2 text-body text-ink-muted sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={identitas.is_active}
                    onChange={(e) =>
                      setIdentitas({ ...identitas, is_active: e.target.checked })
                    }
                    className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
                  />
                  Template aktif
                </label>
              </div>
            ),
          },

          {
            label: 'Susun Kolom',
            validasi: validasiKolom,
            isi: (
              <PenyusunKolom
                kolom={kolom}
                onUbah={setKolom}
                opsi={opsi}
                jenisMaster={jenisMaster}
                galatKolom={galatKolom}
              />
            ),
          },

          {
            label: 'Tinjau',
            isi: (
              <div className="space-y-3">
                <dl className="grid gap-x-6 gap-y-1.5 rounded-card border border-line p-3 sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Nama</dt>
                    <dd className="text-body-lg text-ink">{identitas.name}</dd>
                  </div>
                  {sedangUbah && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-ink-soft">Kode</dt>
                      <dd className="font-mono text-body-lg text-ink">{template.kode}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Departemen</dt>
                    <dd className="text-body-lg text-ink">{namaDepartemen}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Jumlah kolom</dt>
                    <dd className="text-body-lg text-ink">{kolom.length}</dd>
                  </div>
                </dl>

                <div className="overflow-x-auto rounded-card border border-line">
                  <table className="w-full text-table">
                    <thead className="bg-surface-muted">
                      <tr className="border-b border-line">
                        <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-ink-muted">
                          Label
                        </th>
                        <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-ink-muted">
                          Grup
                        </th>
                        <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-ink-muted">
                          Tipe
                        </th>
                        <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-ink-muted">
                          Catatan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {kolom.map((k, index) => (
                        <tr key={index}>
                          <td className="px-3 py-1.5 text-ink">
                            {k.label}
                            {k.is_required && <span className="text-danger"> *</span>}
                          </td>
                          <td className="px-3 py-1.5 text-ink-muted">{k.group_label || '—'}</td>
                          <td className="px-3 py-1.5 text-ink-muted">
                            {LABEL_TIPE[k.type]}
                            {k.unit && ` (${k.unit})`}
                          </td>
                          <td className="px-3 py-1.5 text-ink-muted">
                            {k.computed_from
                              ? `Dihitung: ${k.computed_from}`
                              : k.lookup_source
                                ? `Dari master ${k.lookup_source}`
                                : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
