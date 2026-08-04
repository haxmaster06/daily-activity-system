'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableKosong,
  Td,
  Th,
} from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatAngka } from '@/lib/format';
import type { Departemen } from '@/lib/master-data';
import type { OpsiPenyusunKolom, Template } from '@/lib/template';
import { hapusTemplate } from './actions';
import type { RingkasanJenisMaster } from './penyusun-kolom';
import { TemplateWizard } from './template-wizard';

interface TemplateManagerProps {
  template: Template[];
  departemen: Departemen[];
  opsi: OpsiPenyusunKolom;
  jenisMaster: RingkasanJenisMaster[];
}

/**
 * Pengelola template.
 *
 * Memakai bar filter dan tabel, bukan satu tab per departemen. Jumlah
 * departemen bertambah seiring waktu, dan tab horizontal tidak berskala:
 * makin banyak tab makin tergulir keluar layar dan makin sulit ditemukan
 * (docs/standar-ui-ux.md §2).
 */
export function TemplateManager({
  template,
  departemen,
  opsi,
  jenisMaster,
}: TemplateManagerProps) {
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

      <div className="card overflow-hidden">
        <FilterBar
          placeholderCari="Cari nama atau kode template..."
          pilihan={[
            {
              kunci: 'departemen_id',
              label: 'Departemen',
              opsi: departemen.map((item) => ({ nilai: String(item.id), label: item.nama })),
            },
            {
              kunci: 'status',
              label: 'Status',
              opsi: [
                { nilai: 'aktif', label: 'Aktif' },
                { nilai: 'nonaktif', label: 'Nonaktif' },
              ],
            },
          ]}
        />

        <DataTable>
          <DataTableHead>
            <Th>Nama Template</Th>
            <Th>Kode</Th>
            <Th>Departemen</Th>
            <Th align="right">Kolom</Th>
            <Th>Status</Th>
            <Th align="right">Aksi</Th>
          </DataTableHead>
          <DataTableBody>
            {template.length === 0 ? (
              <DataTableKosong
                kolom={6}
                pesan="Tidak ada template yang cocok dengan penyaringan ini."
              />
            ) : (
              template.map((item) => (
                <tr
                  key={item.id}
                  /*
                   * Seluruh baris dapat diklik untuk membuka template — sasaran
                   * klik yang jauh lebih besar daripada ikon 28px, dan sudah
                   * jadi kebiasaan pada tabel data.
                   *
                   * Tetap dapat dicapai papan ketik: baris punya tabIndex dan
                   * merespons Enter maupun Spasi.
                   */
                  role="button"
                  tabIndex={0}
                  onClick={() => buka(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      buka(item);
                    }
                  }}
                  aria-label={`Buka template ${item.nama}`}
                  className="cursor-pointer transition-colors duration-fast hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  <Td className="font-medium">
                    {item.nama}
                    {item.keterangan && (
                      <span className="mt-0.5 block text-caption font-normal text-ink-soft">
                        {item.keterangan}
                      </span>
                    )}
                  </Td>
                  <Td className="font-mono text-ink-muted">{item.kode}</Td>
                  <Td className="text-ink-muted">
                    {item.berlaku_umum ? (
                      <span className="text-ink-soft">Semua departemen</span>
                    ) : (
                      (item.departemen?.nama ?? '—')
                    )}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {formatAngka(item.jumlah_kolom ?? 0)}
                  </Td>
                  <Td>
                    <StatusBadge status={item.aktif ? 'selesai' : 'belum_mulai'} />
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={(event) => {
                        // Tanpa ini, klik Hapus ikut memicu klik baris.
                        event.stopPropagation();
                        setKonfirmasiHapus(item);
                      }}
                      aria-label={`Hapus template ${item.nama}`}
                      title="Hapus"
                      className="grid size-7 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </DataTableBody>
        </DataTable>

        <p className="border-t border-line px-3 py-2 text-caption text-ink-muted">
          <Layers aria-hidden="true" className="mr-1.5 inline size-3.5 align-text-bottom" />
          Menampilkan {formatAngka(template.length)} template
        </p>
      </div>

      <TemplateWizard
        terbuka={wizardTerbuka}
        onTutup={() => setWizardTerbuka(false)}
        template={sedangDiubah}
        departemen={departemen}
        opsi={opsi}
        jenisMaster={jenisMaster}
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
