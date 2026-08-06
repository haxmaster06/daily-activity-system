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
  /** Seluruh departemen, untuk memilih pengelola. Kosong bila tidak berwenang. */
  pilihanDepartemen?: { id: number; nama: string }[];
  onSelesai: (pesan: string) => void;
}

/** Radix Select menolak string kosong sebagai nilai item. */
const TANPA_INDUK = '__tanpa__';

/**
 * Membuat dan menyunting jenis daftar master.
 *
 * Tiga isian — modal, bukan halaman (`docs/standar-ui-ux.md` §7.1).
 */
export function JenisDialog({
  terbuka,
  onTutup,
  jenis,
  pilihanInduk,
  pilihanDepartemen = [],
  onSelesai,
}: Props) {
  const [nama, setNama] = useState('');
  const [induk, setInduk] = useState(TANPA_INDUK);
  const [keterangan, setKeterangan] = useState('');
  const [pengelola, setPengelola] = useState<number[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setNama(jenis?.nama ?? '');
    setInduk(jenis?.induk_id ? String(jenis.induk_id) : TANPA_INDUK);
    setKeterangan(jenis?.keterangan ?? '');
    setPengelola((jenis?.departemen_pengelola ?? []).map((satu) => satu.id));
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
      // Hanya disertakan bila bidangnya memang tampil. Mengirim array kosong
      // dari layar yang tidak menampilkannya akan mencabut seluruh pengelola.
      ...(pilihanDepartemen.length > 0 ? { departemen_id: pengelola } : {}),
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

        {/*
          Departemen pengelola. Yang mengenal isi sebuah daftar adalah unit
          kerja yang memakainya sehari-hari — daftar Supplier dipegang
          Purchasing, Produk dipegang Produksi. Daftar master yang salah tidak
          berhenti di satu layar: seluruh laporan yang memilih dari sana ikut
          membawanya.

          Bidang ini hanya tampil bagi yang berwenang menetapkannya. Bila
          tampil bagi yang dibatasinya, batas itu terbuka sendiri — cukup
          menambahkan departemennya sendiri ke daftar.
        */}
        {pilihanDepartemen.length > 0 && (
          <fieldset>
            <legend className="field-label">Departemen pengelola</legend>
            <p className="mb-1.5 text-caption text-ink-soft">
              Tanpa satu pun dipilih, daftar ini dapat dikelola siapa pun yang punya izin
              kelola data master.
            </p>

            <div className="max-h-40 overflow-y-auto rounded-input border border-line px-2 py-1.5">
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {pilihanDepartemen.map((satu) => (
                  <label
                    key={satu.id}
                    className="flex items-center gap-2 text-body text-ink-muted"
                  >
                    <input
                      type="checkbox"
                      checked={pengelola.includes(satu.id)}
                      onChange={(e) =>
                        setPengelola((sekarang) =>
                          e.target.checked
                            ? [...sekarang, satu.id]
                            : sekarang.filter((id) => id !== satu.id),
                        )
                      }
                      className="size-3.5 shrink-0 rounded-sm border-line text-primary focus:ring-primary"
                    />
                    {satu.nama}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
