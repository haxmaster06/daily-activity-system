'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import type { JenisMaster } from '@/lib/master-server';
import { buatJenis, perbaruiJenis } from './actions';

interface Props {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti membuat daftar baru. */
  jenis: JenisMaster | null;
  pilihanInduk: JenisMaster[];
  onSelesai: (pesan: string) => void;
}

/** Radix Select menolak string kosong sebagai nilai item. */
const TANPA_INDUK = '__tanpa__';

/**
 * Membuat dan menyunting jenis daftar master.
 *
 * Tiga isian — modal, bukan halaman (`docs/standar-ui-ux.md` §7.1).
 */
export function JenisDialog({ terbuka, onTutup, jenis, pilihanInduk, onSelesai }: Props) {
  const [nama, setNama] = useState('');
  const [induk, setInduk] = useState(TANPA_INDUK);
  const [keterangan, setKeterangan] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setNama(jenis?.nama ?? '');
    setInduk(jenis?.induk_id ? String(jenis.induk_id) : TANPA_INDUK);
    setKeterangan(jenis?.keterangan ?? '');
    setGalat(null);
  }, [terbuka, jenis]);

  /*
   * Sebuah daftar tidak boleh berinduk pada dirinya sendiri. Rantai melingkar
   * yang lebih panjang ditolak server; yang jelas keliru disembunyikan sejak
   * di layar supaya tidak sempat dipilih.
   */
  const opsiInduk = [
    { nilai: TANPA_INDUK, label: 'Tidak berinduk' },
    ...pilihanInduk
      .filter((satu) => satu.id !== jenis?.id)
      .map((satu) => ({ nilai: String(satu.id), label: satu.nama })),
  ];

  async function simpan() {
    if (nama.trim() === '') {
      setGalat('Nama daftar belum diisi.');

      return;
    }

    setMemproses(true);
    setGalat(null);

    const muatan = {
      name: nama.trim(),
      parent_type_id: induk === TANPA_INDUK ? null : Number(induk),
      description: keterangan.trim() || null,
    };

    const hasil = jenis ? await perbaruiJenis(jenis.slug, muatan) : await buatJenis(muatan);

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
      judul={jenis ? `Ubah Daftar ${jenis.nama}` : 'Daftar Baru'}
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
          <label htmlFor="nama-jenis" className="field-label">
            Nama daftar
          </label>
          <input
            id="nama-jenis"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Supplier, Produk, Mesin"
            className="field"
          />
          <span className="mt-1 block text-caption text-ink-soft">
            Penanda daftar dibuat otomatis dari nama ini dan tidak berubah setelahnya.
          </span>
        </div>

        <Select
          id="induk-jenis"
          label="Daftar induk"
          nilai={induk}
          onUbah={setInduk}
          opsi={opsiInduk}
          bantuan="Bila diisi, tiap data pada daftar ini menunjuk satu data pada daftar induknya — misalnya LOT yang menunjuk Supplier."
        />

        <div>
          <label htmlFor="keterangan-jenis" className="field-label">
            Keterangan
          </label>
          <input
            id="keterangan-jenis"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="field"
          />
        </div>
      </div>
    </Modal>
  );
}
