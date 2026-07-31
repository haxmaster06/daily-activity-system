'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  JANGKAUAN_DEPARTEMEN,
  JANGKAUAN_KORPORAT,
  JANGKAUAN_PRIBADI,
} from '@/lib/izin';
import type { RingkasanRole } from '@/lib/master-data';
import { buatPeran, perbaruiPeran } from './actions';

interface RoleDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti menambah peran baru. */
  peran: RingkasanRole | null;
  /** Dipakai untuk menyalin hak akses dari peran yang sudah ada. */
  daftarPeran: RingkasanRole[];
}

/** Radix Select tidak menerima string kosong sebagai nilai item. */
const TANPA_SALINAN = '__kosong__';

const OPSI_JANGKAUAN = [
  { nilai: String(JANGKAUAN_PRIBADI), label: 'Pribadi — hanya datanya sendiri' },
  { nilai: String(JANGKAUAN_DEPARTEMEN), label: 'Departemen — satu departemen' },
  { nilai: String(JANGKAUAN_KORPORAT), label: 'Korporat — seluruh departemen' },
];

/**
 * Keterangan peran. Hak aksesnya sendiri diatur di matriks, bukan di sini.
 *
 * Saat membuat peran baru, hak akses dapat disalin dari peran yang sudah ada —
 * peran baru hampir selalu variasi dari yang sudah berjalan ("seperti
 * Supervisor, tanpa pengingat"), dan menyusunnya dari nol berarti mencentang
 * belasan kali untuk sampai ke titik awal yang sama.
 */
export function RoleDialog({ terbuka, onTutup, peran, daftarPeran }: RoleDialogProps) {
  const router = useRouter();
  const sedangUbah = peran !== null;

  const [nama, setNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [jangkauan, setJangkauan] = useState(String(JANGKAUAN_PRIBADI));
  const [salinDari, setSalinDari] = useState(TANPA_SALINAN);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setGalat(null);
    setGalatKolom({});
    setSalinDari(TANPA_SALINAN);
    setNama(peran?.nama ?? '');
    setKeterangan(peran?.keterangan ?? '');
    setJangkauan(String(peran?.jangkauan_bawaan ?? JANGKAUAN_PRIBADI));
  }, [terbuka, peran]);

  async function simpan() {
    setMemproses(true);
    setGalat(null);
    setGalatKolom({});

    const sumber = daftarPeran.find((satu) => String(satu.id) === salinDari);

    const muatan = {
      name: nama,
      description: keterangan.trim() === '' ? null : keterangan,
      scope_level_default: Number(jangkauan),
      /*
       * Saat menyunting, hak akses yang sudah ada dikirim ulang apa adanya —
       * layar ini tidak mengubahnya, dan mengirim daftar kosong akan
       * mencabutnya diam-diam.
       */
      izin: sedangUbah ? (peran.izin ?? []) : (sumber?.izin ?? []),
    };

    const hasil = sedangUbah
      ? await perbaruiPeran(peran.id, muatan)
      : await buatPeran(muatan);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);
      setGalatKolom(hasil.errors ?? {});

      return;
    }

    onTutup();
    router.refresh();
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={sedangUbah ? 'Ubah Keterangan Peran' : 'Tambah Peran'}
      keterangan={
        sedangUbah
          ? 'Hak aksesnya diatur pada matriks di halaman ini.'
          : 'Hak akses dapat disesuaikan pada matriks setelah peran dibuat.'
      }
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="submit"
            form="form-peran"
            disabled={memproses}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <form
        id="form-peran"
        onSubmit={(event) => {
          event.preventDefault();
          void simpan();
        }}
        className="space-y-3"
        noValidate
      >
        {galat && <Alert jenis="galat" pesan={galat} />}

        <div>
          <label htmlFor="nama-peran" className="field-label">
            Nama Peran
          </label>
          <input
            id="nama-peran"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            aria-invalid={Boolean(galatKolom.name?.[0])}
            className="field"
            required
          />
          {galatKolom.name?.[0] && <span className="field-error">{galatKolom.name[0]}</span>}

          {sedangUbah && peran.sistem && (
            <span className="mt-1 block text-caption text-ink-soft">
              Peran bawaan sistem. Namanya boleh diperbaiki, tetapi peran ini tidak dapat
              dihapus.
            </span>
          )}
        </div>

        <div>
          <label htmlFor="keterangan-peran" className="field-label">
            Keterangan
          </label>
          <input
            id="keterangan-peran"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="field"
          />
        </div>

        <Select
          id="jangkauan-bawaan"
          label="Jangkauan Data Bawaan"
          nilai={jangkauan}
          opsi={OPSI_JANGKAUAN}
          onUbah={setJangkauan}
          bantuan="Mengisi pilihan saat peran ini diberikan; masih bisa diubah per orang."
        />

        {!sedangUbah && (
          <Select
            id="salin-dari"
            label="Salin Hak Akses Dari"
            nilai={salinDari}
            opsi={[
              { nilai: TANPA_SALINAN, label: 'Mulai tanpa hak akses' },
              ...daftarPeran.map((satu) => ({
                nilai: String(satu.id),
                label: `${satu.nama} (${satu.izin?.length ?? 0} hak akses)`,
              })),
            ]}
            onUbah={setSalinDari}
            bantuan="Hasil salinan masih dapat disesuaikan di matriks."
          />
        )}
      </form>
    </Modal>
  );
}
