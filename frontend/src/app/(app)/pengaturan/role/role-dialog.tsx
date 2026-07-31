'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { PillNav } from '@/components/ui/pill-nav';
import { Select } from '@/components/ui/select';
import {
  JANGKAUAN_DEPARTEMEN,
  JANGKAUAN_KORPORAT,
  JANGKAUAN_PRIBADI,
} from '@/lib/izin';
import type { RingkasanRole } from '@/lib/master-data';
import type { GrupIzin } from '@/lib/peran-server';
import { buatPeran, perbaruiPeran } from './actions';

interface RoleDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti menambah peran baru. */
  peran: RingkasanRole | null;
  katalog: GrupIzin[];
}

const OPSI_JANGKAUAN = [
  { nilai: String(JANGKAUAN_PRIBADI), label: 'Pribadi — hanya datanya sendiri' },
  { nilai: String(JANGKAUAN_DEPARTEMEN), label: 'Departemen — satu departemen' },
  { nilai: String(JANGKAUAN_KORPORAT), label: 'Korporat — seluruh departemen' },
];

/**
 * Penyunting peran: identitas singkat plus matriks hak akses.
 *
 * Hak akses dikelompokkan dengan tab karena kelompoknya tetap dan sudah
 * diketahui sejak awal (docs/standar-ui-ux.md §2). Tab-nya dikendalikan state,
 * bukan URL — mengubah URL di dalam modal akan menutup modalnya.
 */
export function RoleDialog({ terbuka, onTutup, peran, katalog }: RoleDialogProps) {
  const router = useRouter();
  const sedangUbah = peran !== null;

  const [nama, setNama] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [jangkauan, setJangkauan] = useState(String(JANGKAUAN_PRIBADI));
  const [izin, setIzin] = useState<string[]>([]);
  const [tab, setTab] = useState(katalog[0]?.kunci ?? '');
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setGalat(null);
    setGalatKolom({});
    setTab(katalog[0]?.kunci ?? '');
    setNama(peran?.nama ?? '');
    setKeterangan(peran?.keterangan ?? '');
    setJangkauan(String(peran?.jangkauan_bawaan ?? JANGKAUAN_PRIBADI));
    setIzin(peran?.izin ?? []);
  }, [terbuka, peran, katalog]);

  function alihkan(kunci: string) {
    setIzin((sebelumnya) =>
      sebelumnya.includes(kunci)
        ? sebelumnya.filter((satu) => satu !== kunci)
        : [...sebelumnya, kunci],
    );
  }

  async function simpan() {
    setMemproses(true);
    setGalat(null);
    setGalatKolom({});

    const muatan = {
      name: nama,
      description: keterangan.trim() === '' ? null : keterangan,
      scope_level_default: Number(jangkauan),
      izin,
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
      judul={sedangUbah ? 'Ubah Peran' : 'Tambah Peran'}
      lebar="lebar"
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

        <div className="grid gap-3 sm:grid-cols-2">
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
                Peran bawaan sistem. Namanya boleh diperbaiki, tetapi peran ini tidak
                dapat dihapus.
              </span>
            )}
          </div>

          <Select
            id="jangkauan-bawaan"
            label="Jangkauan Data Bawaan"
            nilai={jangkauan}
            opsi={OPSI_JANGKAUAN}
            onUbah={setJangkauan}
            bantuan="Mengisi pilihan saat peran ini diberikan; masih bisa diubah per orang."
          />
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

        <div>
          <p className="field-label">Hak Akses</p>

          <PillNav
            nilai={tab}
            onUbah={setTab}
            item={katalog.map((grup) => ({
              nilai: grup.kunci,
              label: grup.nama,
              jumlah: grup.izin.filter((satu) => izin.includes(satu.kunci)).length,
              isi: (
                <ul className="space-y-1.5 pt-1">
                  {grup.izin.map((satu) => (
                    <li key={satu.kunci}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-input px-2 py-1.5 hover:bg-surface-muted">
                        <input
                          type="checkbox"
                          checked={izin.includes(satu.kunci)}
                          onChange={() => alihkan(satu.kunci)}
                          className="mt-0.5 size-4 shrink-0 rounded border-line text-primary focus:ring-primary"
                        />
                        <span className="min-w-0">
                          {/* Yang tampil namanya, bukan kunci teknisnya. */}
                          <span className="block text-body-lg text-ink">{satu.nama}</span>
                          {satu.keterangan && (
                            <span className="block text-body text-ink-muted">
                              {satu.keterangan}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ),
            }))}
          />
        </div>
      </form>
    </Modal>
  );
}
