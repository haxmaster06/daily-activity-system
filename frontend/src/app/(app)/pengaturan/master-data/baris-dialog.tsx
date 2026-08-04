'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import type { BarisMaster, JenisMaster } from '@/lib/master-server';
import { buatBaris, perbaruiBaris } from './actions';

interface Props {
  terbuka: boolean;
  onTutup: () => void;
  jenis: JenisMaster;
  /** Kosong berarti menambah data baru. */
  baris: BarisMaster | null;
  pilihanInduk: { id: number; kode: string; nama: string }[];
  onSelesai: (pesan: string) => void;
}

/**
 * Menambah dan menyunting satu data pada sebuah daftar master.
 *
 * Empat isian — modal (§7.1). Kode tidak diisi pengguna; dibuat server dari
 * nama dan tidak pernah berubah (§1.3), karena laporan lama menyimpan
 * salinannya.
 */
export function BarisDialog({ terbuka, onTutup, jenis, baris, pilihanInduk, onSelesai }: Props) {
  const [nama, setNama] = useState('');
  const [induk, setInduk] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [aktif, setAktif] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setNama(baris?.nama ?? '');
    setInduk(baris?.induk_id ? String(baris.induk_id) : '');
    setKeterangan(baris?.keterangan ?? '');
    setAktif(baris?.aktif ?? true);
    setGalat(null);
  }, [terbuka, baris]);

  const berinduk = jenis.induk !== null;

  async function simpan() {
    if (nama.trim() === '') {
      setGalat('Nama belum diisi.');

      return;
    }

    if (berinduk && induk === '') {
      setGalat(`${jenis.induk?.nama} belum dipilih.`);

      return;
    }

    setMemproses(true);
    setGalat(null);

    const muatan = {
      name: nama.trim(),
      parent_id: berinduk && induk !== '' ? Number(induk) : null,
      description: keterangan.trim() || null,
      is_active: aktif,
    };

    const hasil = baris
      ? await perbaruiBaris(jenis.slug, baris.id, muatan)
      : await buatBaris(jenis.slug, muatan);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);

      return;
    }

    onSelesai(hasil.pesan);
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={baris ? `Ubah ${baris.nama}` : `Tambah ${jenis.nama}`}
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={memproses}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {galat && <Alert jenis="galat" pesan={galat} />}

        <div>
          <label htmlFor="nama-baris" className="field-label">
            Nama
          </label>
          <input
            id="nama-baris"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="field"
          />
        </div>

        {berinduk && (
          <Select
            id="induk-baris"
            label={jenis.induk?.nama ?? 'Induk'}
            nilai={induk}
            onUbah={setInduk}
            placeholder={`Pilih ${jenis.induk?.nama.toLowerCase()}...`}
            opsi={pilihanInduk.map((satu) => ({ nilai: String(satu.id), label: satu.nama }))}
            wajib
          />
        )}

        <div>
          <label htmlFor="keterangan-baris" className="field-label">
            Keterangan
          </label>
          <input
            id="keterangan-baris"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="field"
          />
        </div>

        <label className="flex w-fit items-center gap-2 text-body text-ink-muted">
          <input
            type="checkbox"
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
            className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
          />
          Aktif
        </label>

        <p className="text-caption text-ink-soft">
          Data nonaktif tidak lagi ditawarkan saat mengisi laporan, tetapi laporan yang sudah
          memakainya tetap menampilkannya.
        </p>
      </div>
    </Modal>
  );
}
