'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import type { Departemen, Pengguna, RingkasanRole } from '@/lib/master-data';
import { buatPengguna, perbaruiPengguna } from './actions';

interface UserDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti menambah pengguna baru. */
  pengguna: Pengguna | null;
  departemen: Departemen[];
  role: RingkasanRole[];
}

interface IsiForm {
  name: string;
  email: string;
  department_id: string;
  role_id: string;
  password: string;
}

const KOSONG: IsiForm = { name: '', email: '', department_id: '', role_id: '', password: '' };

/** Form pengguna berisi 5 kolom, sehingga memakai modal (standar §22.1). */
export function UserDialog({
  terbuka,
  onTutup,
  pengguna,
  departemen,
  role,
}: UserDialogProps) {
  const router = useRouter();
  const sedangUbah = pengguna !== null;

  const [isi, setIsi] = useState<IsiForm>(KOSONG);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setGalat(null);
    setGalatKolom({});
    setIsi(
      pengguna
        ? {
            name: pengguna.nama,
            email: pengguna.email,
            department_id: String(pengguna.departemen.id ?? ''),
            role_id: String(role.find((r) => r.slug === pengguna.role.slug)?.id ?? ''),
            password: '',
          }
        : KOSONG,
    );
  }, [terbuka, pengguna, role]);

  async function simpan() {
    setMemproses(true);
    setGalat(null);
    setGalatKolom({});

    const muatan = {
      name: isi.name,
      email: isi.email,
      department_id: Number(isi.department_id),
      role_id: Number(isi.role_id),
      ...(sedangUbah ? {} : { password: isi.password }),
    };

    const hasil = sedangUbah
      ? await perbaruiPengguna(pengguna.id, muatan)
      : await buatPengguna(muatan);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);
      setGalatKolom(hasil.errors ?? {});
      return;
    }

    onTutup();
    router.refresh();
  }

  function pesanKolom(kolom: string): string | undefined {
    return galatKolom[kolom]?.[0];
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={sedangUbah ? 'Ubah Pengguna' : 'Tambah Pengguna'}
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="submit"
            form="form-pengguna"
            disabled={memproses}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <form
        id="form-pengguna"
        onSubmit={(event) => {
          event.preventDefault();
          void simpan();
        }}
        className="space-y-3"
        noValidate
      >
        {galat && <Alert jenis="galat" pesan={galat} />}

        <div>
          <label htmlFor="nama" className="field-label">
            Nama Lengkap
          </label>
          <input
            id="nama"
            value={isi.name}
            onChange={(e) => setIsi({ ...isi, name: e.target.value })}
            aria-invalid={Boolean(pesanKolom('name'))}
            aria-describedby={pesanKolom('name') ? 'galat-nama' : undefined}
            className="field"
            required
          />
          {pesanKolom('name') && (
            <span id="galat-nama" className="field-error">
              {pesanKolom('name')}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={isi.email}
            onChange={(e) => setIsi({ ...isi, email: e.target.value })}
            aria-invalid={Boolean(pesanKolom('email'))}
            aria-describedby={pesanKolom('email') ? 'galat-email' : undefined}
            className="field"
            required
          />
          {pesanKolom('email') && (
            <span id="galat-email" className="field-error">
              {pesanKolom('email')}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Select
              id="departemen"
              label="Departemen"
              placeholder="Pilih departemen"
              nilai={isi.department_id}
              opsi={departemen.map((item) => ({ nilai: String(item.id), label: item.nama }))}
              onUbah={(nilai) => setIsi({ ...isi, department_id: nilai })}
              galat={pesanKolom('department_id')}
            />
          </div>

          <div>
            <Select
              id="role"
              label="Role"
              placeholder="Pilih role"
              nilai={isi.role_id}
              opsi={role.map((item) => ({ nilai: String(item.id), label: item.nama }))}
              onUbah={(nilai) => setIsi({ ...isi, role_id: nilai })}
              galat={pesanKolom('role_id')}
            />
          </div>
        </div>

        {!sedangUbah && (
          <div>
            <label htmlFor="kata-sandi" className="field-label">
              Kata Sandi Awal
            </label>
            <input
              id="kata-sandi"
              type="password"
              value={isi.password}
              onChange={(e) => setIsi({ ...isi, password: e.target.value })}
              aria-invalid={Boolean(pesanKolom('password'))}
              aria-describedby="bantuan-sandi"
              className="field"
              required
            />
            <span id="bantuan-sandi" className="mt-1 block text-caption text-ink-soft">
              Minimal 8 karakter. Sampaikan ke pengguna agar segera diganti.
            </span>
            {pesanKolom('password') && (
              <span className="field-error">{pesanKolom('password')}</span>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
