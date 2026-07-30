'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { BorderGlowCard } from '@/components/ui/border-glow-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DaftarMuncul } from '@/components/ui/daftar-muncul';
import { PillNav, type ItemTab } from '@/components/ui/pill-nav';
import type { Departemen } from '@/lib/master-data';
import type { OpsiPenyusunKolom, Template } from '@/lib/template';
import { hapusTemplate } from './actions';
import { TemplateWizard } from './template-wizard';

interface TemplateManagerProps {
  template: Template[];
  departemen: Departemen[];
  opsi: OpsiPenyusunKolom;
}

/**
 * Pengelola template.
 *
 * Template dikelompokkan per departemen memakai Pill Nav — isinya setara dan
 * banyak, sehingga tab lebih terbaca daripada satu daftar panjang
 * (standar interaksi §2).
 */
export function TemplateManager({ template, departemen, opsi }: TemplateManagerProps) {
  const router = useRouter();

  const [wizardTerbuka, setWizardTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Template | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Template | null>(null);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);

  function buka(target: Template | null) {
    setSedangDiubah(target);
    setWizardTerbuka(true);
  }

  async function hapus() {
    if (!konfirmasiHapus) return;

    const hasil = await hapusTemplate(konfirmasiHapus.id);

    setKonfirmasiHapus(null);
    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  // Departemen yang benar-benar punya template; sisanya tidak perlu jadi tab kosong.
  const departemenBertemplate = departemen.filter((d) =>
    template.some((t) => t.departemen?.id === d.id),
  );

  const tab: ItemTab[] = [
    {
      nilai: 'umum',
      label: 'Semua Departemen',
      jumlah: template.filter((t) => t.berlaku_umum).length,
      isi: <KartuTemplate daftar={template.filter((t) => t.berlaku_umum)} onUbah={buka} onHapus={setKonfirmasiHapus} />,
    },
    ...departemenBertemplate.map((d) => {
      const milikDepartemen = template.filter((t) => t.departemen?.id === d.id);

      return {
        nilai: d.kode.toLowerCase(),
        label: d.nama,
        jumlah: milikDepartemen.length,
        isi: <KartuTemplate daftar={milikDepartemen} onUbah={buka} onHapus={setKonfirmasiHapus} />,
      };
    }),
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-page-title text-ink">Template Laporan</h1>
        <button type="button" onClick={() => buka(null)} className="btn-primary btn-sm">
          <Plus aria-hidden="true" className="size-4" />
          Buat Template
        </button>
      </div>

      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      <PillNav item={tab} kunciUrl="departemen" />

      <TemplateWizard
        terbuka={wizardTerbuka}
        onTutup={() => setWizardTerbuka(false)}
        template={sedangDiubah}
        departemen={departemen}
        opsi={opsi}
      />

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        onSetuju={hapus}
        judul="Hapus Template"
        pesan={`Template ${konfirmasiHapus?.nama ?? ''} beserta seluruh definisi kolomnya akan dihapus. Laporan yang sudah dibuat dengan template ini tidak ikut terhapus, tetapi kolomnya tidak lagi punya keterangan.`}
        labelAksi="Hapus"
        berisiko
      />
    </>
  );
}

function KartuTemplate({
  daftar,
  onUbah,
  onHapus,
}: {
  daftar: Template[];
  onUbah: (template: Template) => void;
  onHapus: (template: Template) => void;
}) {
  if (daftar.length === 0) {
    return (
      <div className="card p-8 text-center text-body-lg text-ink-soft">
        Belum ada template untuk bagian ini.
      </div>
    );
  }

  return (
    <DaftarMuncul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {daftar.map((item) => (
        <BorderGlowCard key={item.id} className="h-full">
          <div className="flex h-full flex-col gap-3 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary-text">
                <Layers aria-hidden="true" className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-section-title text-ink">{item.nama}</h2>
                <p className="mt-0.5 font-mono text-caption text-ink-soft">{item.kode}</p>
                {item.keterangan && (
                  <p className="mt-1 text-body text-ink-muted">{item.keterangan}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onUbah(item)}
                  aria-label={`Ubah template ${item.nama}`}
                  title="Ubah"
                  className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-primary-text"
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onHapus(item)}
                  aria-label={`Hapus template ${item.nama}`}
                  title="Hapus"
                  className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
              <span className="text-caption text-ink-muted">
                {item.jumlah_kolom ?? 0} kolom
              </span>

              {!item.aktif && (
                <span className="rounded-control bg-surface-sunken px-1.5 py-0.5 text-caption font-medium text-ink-muted">
                  Nonaktif
                </span>
              )}
            </div>
          </div>
        </BorderGlowCard>
      ))}
    </DaftarMuncul>
  );
}
