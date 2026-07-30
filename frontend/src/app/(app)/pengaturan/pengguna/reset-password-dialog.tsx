'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import type { Pengguna } from '@/lib/master-data';
import { aturUlangKataSandi } from './actions';

export function ResetPasswordDialog({
  pengguna,
  onTutup,
}: {
  pengguna: Pengguna | null;
  onTutup: () => void;
}) {
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    setSandi('');
    setGalat(null);
    setBerhasil(null);
  }, [pengguna]);

  async function simpan() {
    if (!pengguna) return;

    setMemproses(true);
    setGalat(null);

    const hasil = await aturUlangKataSandi(pengguna.id, sandi);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.errors?.password?.[0] ?? hasil.pesan);
      return;
    }

    setBerhasil(hasil.pesan);
    setSandi('');
  }

  return (
    <Modal
      terbuka={pengguna !== null}
      onTutup={onTutup}
      judul="Atur Ulang Kata Sandi"
      keterangan={
        pengguna
          ? `Kata sandi ${pengguna.nama} akan diganti dan seluruh sesinya berakhir.`
          : undefined
      }
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            {berhasil ? 'Tutup' : 'Batal'}
          </button>
          {!berhasil && (
            <button
              type="submit"
              form="form-reset-sandi"
              disabled={memproses}
              className="btn-primary btn-sm"
            >
              {memproses ? 'Menyimpan...' : 'Simpan'}
            </button>
          )}
        </>
      }
    >
      <form
        id="form-reset-sandi"
        onSubmit={(event) => {
          event.preventDefault();
          void simpan();
        }}
        className="space-y-3"
        noValidate
      >
        {galat && <Alert jenis="galat" pesan={galat} />}
        {berhasil && <Alert jenis="berhasil" pesan={berhasil} />}

        {!berhasil && (
          <div>
            <label htmlFor="sandi-baru" className="field-label">
              Kata Sandi Baru
            </label>
            <input
              id="sandi-baru"
              type="password"
              value={sandi}
              onChange={(event) => setSandi(event.target.value)}
              aria-describedby="bantuan-sandi-baru"
              className="field"
              required
            />
            <span id="bantuan-sandi-baru" className="mt-1 block text-caption text-ink-soft">
              Minimal 8 karakter.
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
