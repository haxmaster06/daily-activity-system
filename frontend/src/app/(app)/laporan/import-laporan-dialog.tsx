'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileUp, XCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  Td,
  Th,
} from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { formatAngka, formatTanggal, formatUkuranBerkas } from '@/lib/format';
import {
  pratinjauImportLaporan,
  simpanImportLaporan,
  type HasilPratinjauImportLaporan,
} from './actions';

export interface PilihanTemplateImport {
  id: number;
  nama: string;
}

interface Props {
  terbuka: boolean;
  onTutup: () => void;
  template: PilihanTemplateImport[];
  onSelesai: (pesan: string) => void;
}

/**
 * Import laporan harian dari berkas Excel, preview-first.
 *
 * Berkas diperiksa lebih dulu dan hasilnya ditampilkan per baris; tidak ada
 * satu pun laporan yang tersimpan sebelum Simpan ditekan
 * (`docs/standar-ui-ux.md` §9).
 *
 * Bentuk kolomnya berbeda tiap template, sehingga templatenya dipilih lebih
 * dulu — dan berkas yang diunggah harus berasal dari template yang sama.
 */
export function ImportLaporanDialog({ terbuka, onTutup, template, onSelesai }: Props) {
  const [templateId, setTemplateId] = useState('');
  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<HasilPratinjauImportLaporan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setTemplateId(template.length === 1 ? String(template[0].id) : '');
    setBerkas(null);
    setHasil(null);
    setGalat(null);
  }, [terbuka, template]);

  async function periksa(dipilih: File) {
    setBerkas(dipilih);
    setHasil(null);
    setGalat(null);
    setMemeriksa(true);

    const muatan = new FormData();
    muatan.append('berkas', dipilih);

    const balasan = await pratinjauImportLaporan(Number(templateId), muatan);
    setMemeriksa(false);

    if (!balasan.berhasil || !balasan.hasil) {
      setGalat(balasan.pesan);

      return;
    }

    setHasil(balasan.hasil);
  }

  async function simpan() {
    if (berkas === null) return;

    setMenyimpan(true);
    setGalat(null);

    const muatan = new FormData();
    muatan.append('berkas', berkas);

    const balasan = await simpanImportLaporan(Number(templateId), muatan);
    setMenyimpan(false);

    if (!balasan.berhasil) {
      setGalat(balasan.pesan);

      return;
    }

    onSelesai(balasan.pesan);
  }

  // Kolom tampilan diambil dari baris pertama yang berhasil dibaca: bentuknya
  // berbeda tiap template, sehingga tidak dapat ditulis di muka.
  const kolomTampilan = Object.keys(
    hasil?.baris.find((satu) => Object.keys(satu.tampilan).length > 0)?.tampilan ?? {},
  );

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul="Import Laporan"
      keterangan="Isi berkas diperiksa dan ditampilkan lebih dulu. Laporan hasil import tersimpan sebagai draf — kirim sendiri setelah diperiksa."
      lebar="lebar"
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={menyimpan || (hasil?.ringkasan.diterima ?? 0) === 0}
            className="btn-primary btn-sm"
          >
            {menyimpan ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {galat && <Alert jenis="galat" pesan={galat} />}

        <Select
          id="template-import"
          label="Template Laporan"
          nilai={templateId}
          onUbah={(nilai) => {
            setTemplateId(nilai);
            // Berkas lama milik template lain; hasilnya tidak lagi berlaku.
            setBerkas(null);
            setHasil(null);
          }}
          opsi={template.map((satu) => ({ nilai: String(satu.id), label: satu.nama }))}
          placeholder="Pilih template..."
          wajib
        />

        {templateId !== '' && (
          <a
            href={`/api/template/${templateId}/import-template`}
            className="btn-secondary btn-sm w-fit"
          >
            <Download aria-hidden="true" className="size-4" />
            Unduh Template
          </a>
        )}

        <div>
          <label htmlFor="berkas-import-laporan" className="field-label">
            Berkas Excel
          </label>
          <input
            id="berkas-import-laporan"
            type="file"
            accept=".xlsx,.xls"
            disabled={templateId === ''}
            onChange={(e) => {
              const dipilih = e.target.files?.[0];
              if (dipilih) void periksa(dipilih);
            }}
            className="field h-auto py-1.5 file:mr-2 file:rounded-control file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-body file:text-ink-muted disabled:opacity-50"
          />
          {templateId === '' && (
            <span className="mt-1 block text-caption text-ink-soft">
              Pilih template lebih dulu — bentuk kolomnya berbeda tiap template.
            </span>
          )}
          {berkas && (
            <span className="mt-1 block text-caption text-ink-soft">
              {berkas.name} — {formatUkuranBerkas(berkas.size)}
            </span>
          )}
        </div>

        {memeriksa && <p className="text-body text-ink-muted">Memeriksa isi berkas...</p>}

        {hasil && (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-control bg-secondary-subtle px-2 py-1 text-caption font-medium text-secondary-text">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Diterima: {formatAngka(hasil.ringkasan.diterima)} baris
              </span>
              <span className="inline-flex items-center gap-1 rounded-control bg-danger-subtle px-2 py-1 text-caption font-medium text-danger-text">
                <XCircle aria-hidden="true" className="size-3.5" />
                Dilewati: {formatAngka(hasil.ringkasan.ditolak)} baris
              </span>
              <span className="inline-flex items-center gap-1 rounded-control bg-primary-subtle px-2 py-1 text-caption font-medium text-primary-text">
                Menjadi {formatAngka(hasil.ringkasan.laporan)} laporan draf
              </span>
            </div>

            {hasil.terpotong && (
              <Alert
                jenis="galat"
                pesan="Berkas melebihi batas baris yang dapat diproses sekaligus. Hanya bagian awalnya yang diperiksa dan akan tersimpan."
              />
            )}

            {hasil.tanggal.length > 0 && (
              <p className="text-body text-ink-muted">
                Tanggal yang akan dibuat:{' '}
                {hasil.tanggal.map((satu) => formatTanggal(satu.tanggal)).join(', ')}.
              </p>
            )}

            {hasil.ringkasan.total === 0 ? (
              <p className="text-body text-ink-muted">
                Berkas tidak memuat satu baris data pun.
              </p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <Th align="right">Baris</Th>
                  <Th>Tanggal</Th>
                  {kolomTampilan.map((label) => (
                    <Th key={label}>{label}</Th>
                  ))}
                  <Th>Catatan</Th>
                </DataTableHead>
                <DataTableBody>
                  {hasil.baris.map((satu) => (
                    <tr
                      key={satu.baris}
                      className={cn(
                        'border-b border-line last:border-0',
                        satu.tindakan === 'ditolak' && 'bg-danger-subtle/40',
                      )}
                    >
                      <Td align="right">{satu.baris}</Td>
                      <Td>{satu.tanggal ? formatTanggal(satu.tanggal) : '—'}</Td>
                      {kolomTampilan.map((label) => (
                        <Td key={label}>{satu.tampilan[label] || '—'}</Td>
                      ))}
                      {/* Alasan penolakan ditulis penuh — `truncate` dilarang
                          untuk isi bermakna (standar §23.2). */}
                      <Td>{satu.alasan ?? 'Akan disimpan'}</Td>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            )}

            {hasil.ringkasan.diterima === 0 && hasil.ringkasan.total > 0 && (
              <p className="text-body text-ink-muted">
                Tidak ada baris yang dapat disimpan. Perbaiki berkasnya lalu pilih ulang.
              </p>
            )}
          </>
        )}

        {!hasil && !memeriksa && templateId !== '' && (
          <p className="flex items-center gap-1.5 text-body text-ink-soft">
            <FileUp aria-hidden="true" className="size-4" />
            Pilih berkas Excel untuk melihat isinya.
          </p>
        )}
      </div>
    </Modal>
  );
}
