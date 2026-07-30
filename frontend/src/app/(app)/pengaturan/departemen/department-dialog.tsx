'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import type { Departemen } from '@/lib/master-data';
import { buatDepartemen, perbaruiDepartemen } from './actions';

interface IsiForm {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

const KOSONG: IsiForm = { code: '', name: '', description: '', is_active: true };

/** Form departemen berisi 4 kolom, sehingga memakai modal (standar §22.1). */
export function DepartmentDialog({
  terbuka,
  onTutup,
  departemen,
}: {
  terbuka: boolean;
  onTutup: () => void;
  departemen: Departemen | null;
}) {
  const router = useRouter();
  const sedangUbah = departemen !== null;

  const [isi, setIsi] = useState<IsiForm>(KOSONG);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setGalat(null);
    setGalatKolom({});
    setIsi(
      departemen
        ? {
            code: departemen.kode,
            name: departemen.nama,
            description: departemen.keterangan ?? '',
            is_active: departemen.aktif,
          }
        : KOSONG,
    );
  }, [terbuka, departemen]);

  async function simpan() {
    setMemproses(true);
    setGalat(null);
    setGalatKolom({});

    const muatan = {
      code: isi.code.trim().toUpperCase(),
      name: isi.name.trim(),
      description: isi.description.trim() || null,
      is_active: isi.is_active,
    };

    const hasil = sedangUbah
      ? await perbaruiDepartemen(departemen.id, muatan)
      : await buatDepartemen(muatan);

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
      judul={sedangUbah ? 'Ubah Departemen' : 'Tambah Departemen'}
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="submit"
            form="form-departemen"
            disabled={memproses}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <form
        id="form-departemen"
        onSubmit={(event) => {
          event.preventDefault();
          void simpan();
        }}
        className="space-y-3"
        noValidate
      >
        {galat && <Alert jenis="galat" pesan={galat} />}

        <div>
          <label htmlFor="nama-departemen" className="field-label">
            Nama Departemen
          </label>
          <input
            id="nama-departemen"
            value={isi.name}
            onChange={(e) => setIsi({ ...isi, name: e.target.value })}
            aria-invalid={Boolean(galatKolom.name)}
            className="field"
            required
          />
          {galatKolom.name && <span className="field-error">{galatKolom.name[0]}</span>}
        </div>

        <div>
          <label htmlFor="kode-departemen" className="field-label">
            Kode
          </label>
          <input
            id="kode-departemen"
            value={isi.code}
            onChange={(e) => setIsi({ ...isi, code: e.target.value.toUpperCase() })}
            aria-invalid={Boolean(galatKolom.code)}
            aria-describedby="bantuan-kode"
            className="field font-mono"
            required
          />
          <span id="bantuan-kode" className="mt-1 block text-caption text-ink-soft">
            Huruf kapital, angka, dan garis bawah. Dipakai sebagai penanda tetap.
          </span>
          {galatKolom.code && <span className="field-error">{galatKolom.code[0]}</span>}
        </div>

        <div>
          <label htmlFor="keterangan-departemen" className="field-label">
            Keterangan
          </label>
          <input
            id="keterangan-departemen"
            value={isi.description}
            onChange={(e) => setIsi({ ...isi, description: e.target.value })}
            className="field"
          />
        </div>

        <label className="flex w-fit items-center gap-2 text-body text-ink-muted">
          <input
            type="checkbox"
            checked={isi.is_active}
            onChange={(e) => setIsi({ ...isi, is_active: e.target.checked })}
            className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
          />
          Departemen aktif
        </label>
      </form>
    </Modal>
  );
}
