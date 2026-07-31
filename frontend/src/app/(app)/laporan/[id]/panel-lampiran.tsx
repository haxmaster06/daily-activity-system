'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type DragEvent } from 'react';
import { FileSpreadsheet, FileText, Image as IkonGambar, Paperclip, Trash2, Upload } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatTanggalWaktu, formatUkuranBerkas } from '@/lib/format';
import type { Lampiran } from '@/lib/laporan';
import { hapusLampiran, unggahLampiran } from './lampiran-aksi';

interface PanelLampiranProps {
  laporanId: number;
  lampiran: Lampiran[];
  /** Pemiliknya boleh menambah, termasuk setelah laporan dikirim. */
  bolehUnggah: boolean;
  /** Menghapus hanya selagi laporan masih draf. */
  bolehHapus: boolean;
}

const MAKS_BYTE = 10 * 1024 * 1024;
const EKSTENSI = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'xlsx', 'docx'];

function ikonUntuk(tipe: string) {
  if (tipe.startsWith('image/')) return IkonGambar;
  if (tipe.includes('spreadsheet')) return FileSpreadsheet;

  return FileText;
}

/**
 * Lampiran laporan: unggah, unduh, hapus.
 *
 * Unduhan lewat `/api/lampiran/{id}` — token berada di cookie httpOnly,
 * sehingga peramban tidak dapat memanggil backend langsung, dan izinnya tetap
 * diperiksa server.
 */
export function PanelLampiran({
  laporanId,
  lampiran,
  bolehUnggah,
  bolehHapus,
}: PanelLampiranProps) {
  const router = useRouter();
  const masukan = useRef<HTMLInputElement>(null);

  const [mengunggah, setMengunggah] = useState(false);
  const [diseret, setDiseret] = useState(false);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Lampiran | null>(null);
  const [hasil, setHasil] = useState<{ jenis: 'galat' | 'berhasil'; pesan: string } | null>(
    null,
  );

  async function kirim(berkas: File) {
    /*
     * Diperiksa juga di layar supaya penolakan terasa seketika. Yang
     * menentukan tetap server — pemeriksaan di sini hanya menghemat satu
     * perjalanan bolak-balik, bukan menggantikan apa pun.
     */
    const ekstensi = berkas.name.split('.').pop()?.toLowerCase() ?? '';

    if (!EKSTENSI.includes(ekstensi)) {
      setHasil({
        jenis: 'galat',
        pesan: 'Jenis berkas tidak diterima. Yang dapat dilampirkan: JPG, PNG, WEBP, PDF, XLSX, DOCX.',
      });

      return;
    }

    if (berkas.size > MAKS_BYTE) {
      setHasil({ jenis: 'galat', pesan: 'Ukuran lampiran paling besar 10 MB.' });

      return;
    }

    setMengunggah(true);
    setHasil(null);

    const muatan = new FormData();
    muatan.append('berkas', berkas);

    const jawaban = await unggahLampiran(laporanId, muatan);

    setMengunggah(false);

    /*
     * Pesan per kolom lebih berguna daripada pesan umum "Periksa kembali isian
     * Anda" — pengguna perlu tahu berkasnya kenapa, bukan bahwa ada yang salah.
     */
    setHasil({
      jenis: jawaban.berhasil ? 'berhasil' : 'galat',
      pesan: jawaban.errors?.berkas?.[0] ?? jawaban.pesan,
    });

    if (jawaban.berhasil) router.refresh();
  }

  function jatuh(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDiseret(false);

    const berkas = event.dataTransfer.files[0];
    if (berkas) void kirim(berkas);
  }

  async function konfirmasiPenghapusan() {
    if (!konfirmasiHapus) return;

    const jawaban = await hapusLampiran(laporanId, konfirmasiHapus.id);

    setHasil({ jenis: jawaban.berhasil ? 'berhasil' : 'galat', pesan: jawaban.pesan });
    setKonfirmasiHapus(null);

    if (jawaban.berhasil) router.refresh();
  }

  return (
    <section className="card mb-3 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Paperclip aria-hidden="true" className="size-4 text-ink-soft" />
        <h2 className="font-heading text-section-title text-ink">
          Lampiran{lampiran.length > 0 ? ` (${lampiran.length})` : ''}
        </h2>
      </div>

      {hasil && <Alert jenis={hasil.jenis} pesan={hasil.pesan} className="mb-2.5" />}

      {lampiran.length === 0 ? (
        <p className="mb-2.5 text-body text-ink-soft">Belum ada lampiran pada laporan ini.</p>
      ) : (
        <ul className="mb-2.5 space-y-1.5">
          {lampiran.map((item) => {
            const Ikon = ikonUntuk(item.tipe);

            return (
              <li
                key={item.id}
                className="flex items-center gap-2.5 rounded-input border border-line px-2.5 py-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-soft">
                  <Ikon aria-hidden="true" className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  {/*
                    Unduhan lewat tautan biasa: peramban yang menangani
                    berkasnya, dan isinya tidak pernah ditahan di memori.
                    Nama berkas tidak dipotong (standar §6.2).
                  */}
                  <a
                    href={`/api/lampiran/${item.id}`}
                    download
                    className="block break-all text-body-lg text-primary-text hover:underline"
                  >
                    {item.nama}
                  </a>
                  <span className="block text-caption text-ink-soft">
                    {formatUkuranBerkas(item.ukuran)}
                    {item.pengunggah ? ` · ${item.pengunggah}` : ''}
                    {item.diunggah_pada ? ` · ${formatTanggalWaktu(item.diunggah_pada)}` : ''}
                  </span>
                </span>

                {bolehHapus && (
                  <button
                    type="button"
                    onClick={() => setKonfirmasiHapus(item)}
                    aria-label={`Hapus lampiran ${item.nama}`}
                    title="Hapus"
                    className="grid size-7 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {bolehUnggah && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDiseret(true);
          }}
          onDragLeave={() => setDiseret(false)}
          onDrop={jatuh}
          className={[
            'rounded-input border border-dashed px-3 py-5 text-center transition-colors duration-fast',
            diseret ? 'border-primary bg-primary-subtle/40' : 'border-line',
          ].join(' ')}
        >
          <input
            ref={masukan}
            type="file"
            accept={EKSTENSI.map((e) => `.${e}`).join(',')}
            onChange={(event) => {
              const berkas = event.target.files?.[0];
              if (berkas) void kirim(berkas);

              // Dikosongkan supaya berkas yang sama dapat dipilih lagi setelah
              // penolakan — tanpa ini, memilih ulang tidak memicu apa pun.
              event.target.value = '';
            }}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => masukan.current?.click()}
            disabled={mengunggah}
            className="btn-ghost btn-sm"
          >
            <Upload aria-hidden="true" className="size-4" />
            {mengunggah ? 'Mengunggah...' : 'Pilih Berkas'}
          </button>

          <p className="mt-1.5 text-caption text-ink-soft">
            Atau seret berkasnya ke sini. JPG, PNG, WEBP, PDF, XLSX, DOCX — paling besar
            10 MB.
          </p>
        </div>
      )}

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        judul="Hapus lampiran"
        pesan={`Lampiran ${konfirmasiHapus?.nama ?? ''} akan dihapus dari laporan ini. Tindakan ini tidak dapat dibatalkan.`}
        labelAksi="Hapus"
        berisiko
        onSetuju={() => konfirmasiPenghapusan()}
      />
    </section>
  );
}
