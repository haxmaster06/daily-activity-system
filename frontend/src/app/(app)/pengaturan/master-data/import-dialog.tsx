'use client';

import { useEffect, useRef, useState } from 'react';
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
import { cn } from '@/lib/cn';
import { formatAngka, formatUkuranBerkas } from '@/lib/format';
import type { JenisMaster } from '@/lib/master-server';
import {
  pratinjauImport,
  simpanImport,
  type HasilPratinjauImport,
} from './actions';

interface ImportDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  jenis: JenisMaster;
  onSelesai: (pesan: string) => void;
}

const RAGAM_TINDAKAN: Record<string, { label: string; kelas: string }> = {
  baru: { label: 'Ditambahkan', kelas: 'bg-secondary-subtle text-secondary-text' },
  perbarui: { label: 'Diperbarui', kelas: 'bg-accent-subtle text-accent-text' },
  ditolak: { label: 'Dilewati', kelas: 'bg-danger-subtle text-danger-text' },
};

/**
 * Import daftar master, preview-first.
 *
 * Berkas diperiksa lebih dulu dan hasilnya ditampilkan per baris; tidak ada
 * satu pun data yang tersimpan sebelum pengguna menekan Simpan. Ini standar
 * project, bukan pilihan (`docs/standar-ui-ux.md` §9) — sama seperti export
 * yang tidak menyediakan unduhan langsung.
 *
 * Berkasnya ditahan di peramban dan dikirim dua kali: sekali untuk diperiksa,
 * sekali untuk disimpan. Menyimpannya sementara di server berarti mengurus
 * pembersihan berkas sisa, dan berkas sementara yang tidak pernah terhapus
 * adalah cara paling sunyi untuk menghabiskan ruang penyimpanan.
 */
export function ImportDialog({ terbuka, onTutup, jenis, onSelesai }: ImportDialogProps) {
  const inputBerkas = useRef<HTMLInputElement>(null);

  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<HasilPratinjauImport | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (terbuka) return;

    setBerkas(null);
    setHasil(null);
    setGalat(null);
  }, [terbuka]);

  async function periksa(dipilih: File) {
    setBerkas(dipilih);
    setHasil(null);
    setGalat(null);
    setMemeriksa(true);

    const muatan = new FormData();
    muatan.append('berkas', dipilih);

    const balasan = await pratinjauImport(jenis.slug, muatan);
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

    const balasan = await simpanImport(jenis.slug, muatan);
    setMenyimpan(false);

    if (!balasan.berhasil) {
      setGalat(balasan.pesan);

      return;
    }

    onSelesai(balasan.pesan);
  }

  const adaYangTersimpan =
    hasil !== null && hasil.ringkasan.baru + hasil.ringkasan.perbarui > 0;

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={`Import ${jenis.nama}`}
      keterangan="Isi berkas diperiksa dan ditampilkan lebih dulu. Tidak ada data yang tersimpan sebelum Anda menekan Simpan."
      lebar="lebar"
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={!adaYangTersimpan || menyimpan}
            className="btn-primary btn-sm"
          >
            {menyimpan ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {galat && <Alert jenis="galat" pesan={galat} />}

        <a
          href={`/api/master/${jenis.slug}/template-import`}
          className="btn-secondary btn-sm w-fit"
        >
          <Download aria-hidden="true" className="size-4" />
          Unduh Template
        </a>

        <div>
          <label htmlFor="berkas-import" className="field-label">
            Berkas Excel
          </label>
          <input
            ref={inputBerkas}
            id="berkas-import"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const dipilih = e.target.files?.[0];
              if (dipilih) void periksa(dipilih);
            }}
            className="field h-auto py-1.5 file:mr-2 file:rounded-control file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-body file:text-ink-muted"
          />
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
              {(
                [
                  ['baru', hasil.ringkasan.baru],
                  ['perbarui', hasil.ringkasan.perbarui],
                  ['ditolak', hasil.ringkasan.ditolak],
                ] as const
              ).map(([kunci, jumlah]) => (
                <span
                  key={kunci}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-control px-2 py-1 text-caption font-medium',
                    RAGAM_TINDAKAN[kunci].kelas,
                  )}
                >
                  {kunci === 'ditolak' ? (
                    <XCircle aria-hidden="true" className="size-3.5" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  )}
                  {RAGAM_TINDAKAN[kunci].label}: {formatAngka(jumlah)}
                </span>
              ))}
            </div>

            {hasil.terpotong && (
              <Alert
                jenis="galat"
                pesan="Berkas melebihi batas baris yang dapat diproses sekaligus. Hanya bagian awalnya yang diperiksa dan akan tersimpan."
              />
            )}

            {hasil.ringkasan.total === 0 ? (
              <p className="text-body text-ink-muted">
                Berkas tidak memuat satu baris data pun.
              </p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <Th align="right">Baris</Th>
                  <Th>Nama</Th>
                  {jenis.induk && <Th>{jenis.induk.nama}</Th>}
                  <Th>Tindakan</Th>
                  <Th>Catatan</Th>
                </DataTableHead>
                <DataTableBody>
                  {hasil.baris.map((satu) => (
                    <tr key={satu.baris} className="border-b border-line last:border-0">
                      <Td align="right">{satu.baris}</Td>
                      <Td>{satu.nama || '—'}</Td>
                      {jenis.induk && <Td>{satu.induk ?? '—'}</Td>}
                      <Td>
                        <span
                          className={cn(
                            'inline-flex rounded-control px-1.5 py-0.5 text-caption font-medium',
                            RAGAM_TINDAKAN[satu.tindakan].kelas,
                          )}
                        >
                          {RAGAM_TINDAKAN[satu.tindakan].label}
                        </span>
                      </Td>
                      {/* Alasan penolakan ditulis penuh — `truncate` dilarang
                          untuk isi bermakna (standar §23.2). */}
                      <Td>{satu.alasan ?? '—'}</Td>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            )}

            {!adaYangTersimpan && hasil.ringkasan.total > 0 && (
              <p className="text-body text-ink-muted">
                Tidak ada baris yang dapat disimpan. Perbaiki berkasnya lalu pilih ulang.
              </p>
            )}
          </>
        )}

        {!hasil && !memeriksa && (
          <p className="flex items-center gap-1.5 text-body text-ink-soft">
            <FileUp aria-hidden="true" className="size-4" />
            Pilih berkas Excel untuk melihat isinya.
          </p>
        )}
      </div>
    </Modal>
  );
}
