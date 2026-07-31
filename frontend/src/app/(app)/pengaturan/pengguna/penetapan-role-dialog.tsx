'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  JANGKAUAN_DEPARTEMEN,
  JANGKAUAN_KORPORAT,
  JANGKAUAN_PRIBADI,
} from '@/lib/izin';
import type { Departemen, Pengguna, RingkasanRole } from '@/lib/master-data';
import { simpanPenetapanRole, type Penetapan } from './actions';

interface PenetapanRoleDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  pengguna: Pengguna | null;
  departemen: Departemen[];
  role: RingkasanRole[];
}

/** Radix Select tidak menerima string kosong sebagai nilai item. */
const IKUT_PENGGUNA = '__ikut__';

const OPSI_JANGKAUAN = [
  { nilai: String(JANGKAUAN_PRIBADI), label: 'Pribadi — hanya datanya sendiri' },
  { nilai: String(JANGKAUAN_DEPARTEMEN), label: 'Departemen — satu departemen' },
  { nilai: String(JANGKAUAN_KORPORAT), label: 'Korporat — seluruh departemen' },
];

interface Baris {
  roleId: string;
  scopeLevel: string;
  departemenId: string;
}

/**
 * Pengelolaan penetapan peran seorang pengguna.
 *
 * Bukan form dengan sejumlah kolom tetap, melainkan penyunting kumpulan baris
 * yang jumlahnya berubah-ubah — karena itu dipisahkan dari dialog identitas
 * pengguna. Menyatukannya membuat jumlah isian tidak berbatas, dan
 * menghasilkan modal menggulir yang berisi daftar menggulir.
 */
export function PenetapanRoleDialog({
  terbuka,
  onTutup,
  pengguna,
  departemen,
  role,
}: PenetapanRoleDialogProps) {
  const router = useRouter();

  const [baris, setBaris] = useState<Baris[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka || !pengguna) return;

    setGalat(null);
    setBaris(
      pengguna.penetapan.map((satu) => ({
        roleId: String(satu.role_id),
        scopeLevel: String(satu.scope_level),
        departemenId: satu.department_id === null ? IKUT_PENGGUNA : String(satu.department_id),
      })),
    );
  }, [terbuka, pengguna]);

  function ubah(index: number, isi: Partial<Baris>) {
    setBaris((sebelumnya) =>
      sebelumnya.map((satu, i) => {
        if (i !== index) return satu;

        const gabungan = { ...satu, ...isi };

        // Departemen hanya bermakna pada jangkauan Departemen; server pun
        // menolaknya di tingkat lain.
        if (gabungan.scopeLevel !== String(JANGKAUAN_DEPARTEMEN)) {
          gabungan.departemenId = IKUT_PENGGUNA;
        }

        return gabungan;
      }),
    );
  }

  function tambah() {
    const bawaan = role[0];

    setBaris((sebelumnya) => [
      ...sebelumnya,
      {
        roleId: bawaan ? String(bawaan.id) : '',
        scopeLevel: String(bawaan?.jangkauan_bawaan ?? JANGKAUAN_PRIBADI),
        departemenId: IKUT_PENGGUNA,
      },
    ]);
  }

  async function simpan() {
    if (!pengguna) return;

    setMemproses(true);
    setGalat(null);

    const muatan: Penetapan[] = baris
      .filter((satu) => satu.roleId !== '')
      .map((satu) => ({
        role_id: Number(satu.roleId),
        scope_level: Number(satu.scopeLevel),
        department_id:
          satu.scopeLevel === String(JANGKAUAN_DEPARTEMEN) &&
          satu.departemenId !== IKUT_PENGGUNA
            ? Number(satu.departemenId)
            : null,
      }));

    const hasil = await simpanPenetapanRole(pengguna.id, muatan);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);
      return;
    }

    onTutup();
    router.refresh();
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul="Penetapan Peran"
      keterangan={
        pengguna
          ? `${pengguna.nama} memperoleh gabungan hak akses dari seluruh perannya, dan jangkauan data tertingginya.`
          : undefined
      }
      lebar="lebar"
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={memproses || baris.length === 0}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {galat && <Alert jenis="galat" pesan={galat} />}

        {baris.length === 0 ? (
          <p className="rounded-input border border-dashed border-line px-3 py-6 text-center text-body text-ink-soft">
            Belum ada peran. Tanpa peran, pengguna ini tidak dapat membuka apa pun.
          </p>
        ) : (
          <ul className="space-y-2">
            {baris.map((satu, index) => (
              <li
                key={index}
                className="grid items-end gap-2 rounded-input border border-line p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Select
                  id={`peran-${index}`}
                  label="Peran"
                  placeholder="Pilih peran"
                  nilai={satu.roleId}
                  opsi={role.map((item) => ({ nilai: String(item.id), label: item.nama }))}
                  onUbah={(nilai) => {
                    const dipilih = role.find((item) => String(item.id) === nilai);

                    ubah(index, {
                      roleId: nilai,
                      // Jangkauan bawaan peran mengisi pilihannya, bukan
                      // menentukannya — yang berlaku tetap yang tersimpan di
                      // penetapan ini.
                      scopeLevel: String(dipilih?.jangkauan_bawaan ?? satu.scopeLevel),
                    });
                  }}
                />

                <Select
                  id={`jangkauan-${index}`}
                  label="Jangkauan Data"
                  nilai={satu.scopeLevel}
                  opsi={OPSI_JANGKAUAN}
                  onUbah={(nilai) => ubah(index, { scopeLevel: nilai })}
                />

                <Select
                  id={`departemen-${index}`}
                  label="Departemen"
                  nilai={satu.departemenId}
                  opsi={[
                    // Selalu tersurat, tidak pernah placeholder kosong: pilihan
                    // ini membuat jangkauannya ikut berpindah bila pengguna
                    // dipindah departemen.
                    { nilai: IKUT_PENGGUNA, label: 'Departemen pengguna (mengikuti)' },
                    ...departemen.map((item) => ({
                      nilai: String(item.id),
                      label: item.nama,
                    })),
                  ]}
                  onUbah={(nilai) => ubah(index, { departemenId: nilai })}
                  nonaktif={satu.scopeLevel !== String(JANGKAUAN_DEPARTEMEN)}
                />

                <button
                  type="button"
                  onClick={() => setBaris((s) => s.filter((_, i) => i !== index))}
                  aria-label="Hapus penetapan"
                  className="btn-ghost btn-sm h-input-sm text-danger-text"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={tambah}
          disabled={role.length === 0}
          className="btn-ghost btn-sm"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tambah Penetapan
        </button>
      </div>
    </Modal>
  );
}
