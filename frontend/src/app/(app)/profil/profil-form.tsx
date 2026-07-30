'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { perbaruiProfil, ubahKataSandi } from './actions';

export function FormNama({ namaAwal }: { namaAwal: string }) {
  const router = useRouter();
  const [nama, setNama] = useState(namaAwal);
  const [pesan, setPesan] = useState<{ jenis: 'galat' | 'berhasil'; teks: string } | null>(null);
  const [memproses, setMemproses] = useState(false);

  async function simpan() {
    setMemproses(true);
    setPesan(null);

    const hasil = await perbaruiProfil(nama.trim());

    setMemproses(false);
    setPesan({
      jenis: hasil.berhasil ? 'berhasil' : 'galat',
      teks: hasil.errors?.name?.[0] ?? hasil.pesan,
    });

    if (hasil.berhasil) router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void simpan();
      }}
      className="space-y-3"
      noValidate
    >
      {pesan && <Alert jenis={pesan.jenis} pesan={pesan.teks} />}

      <div className="max-w-sm">
        <label htmlFor="nama-profil" className="field-label">
          Nama Lengkap
        </label>
        <input
          id="nama-profil"
          value={nama}
          onChange={(event) => setNama(event.target.value)}
          className="field"
          required
        />
      </div>

      <button
        type="submit"
        disabled={memproses || nama.trim() === namaAwal || nama.trim() === ''}
        className="btn-primary btn-sm"
      >
        {memproses ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}

export function FormKataSandi() {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [pesan, setPesan] = useState<{ jenis: 'galat' | 'berhasil'; teks: string } | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  const [memproses, setMemproses] = useState(false);

  async function simpan() {
    setMemproses(true);
    setPesan(null);
    setGalatKolom({});

    const hasil = await ubahKataSandi(lama, baru, konfirmasi);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalatKolom(hasil.errors ?? {});
      setPesan({ jenis: 'galat', teks: hasil.pesan });
      return;
    }

    setPesan({ jenis: 'berhasil', teks: hasil.pesan });
    setLama('');
    setBaru('');
    setKonfirmasi('');
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void simpan();
      }}
      className="space-y-3"
      noValidate
    >
      {pesan && <Alert jenis={pesan.jenis} pesan={pesan.teks} />}

      <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="sandi-lama" className="field-label">
            Kata Sandi Lama
          </label>
          <input
            id="sandi-lama"
            type="password"
            autoComplete="current-password"
            value={lama}
            onChange={(event) => setLama(event.target.value)}
            aria-invalid={Boolean(galatKolom.kata_sandi_lama)}
            className="field"
            required
          />
          {galatKolom.kata_sandi_lama && (
            <span className="field-error">{galatKolom.kata_sandi_lama[0]}</span>
          )}
        </div>

        <div>
          <label htmlFor="sandi-baru" className="field-label">
            Kata Sandi Baru
          </label>
          <input
            id="sandi-baru"
            type="password"
            autoComplete="new-password"
            value={baru}
            onChange={(event) => setBaru(event.target.value)}
            aria-invalid={Boolean(galatKolom.kata_sandi_baru)}
            className="field"
            required
          />
          {galatKolom.kata_sandi_baru && (
            <span className="field-error">{galatKolom.kata_sandi_baru[0]}</span>
          )}
        </div>

        <div>
          <label htmlFor="sandi-konfirmasi" className="field-label">
            Ulangi Kata Sandi Baru
          </label>
          <input
            id="sandi-konfirmasi"
            type="password"
            autoComplete="new-password"
            value={konfirmasi}
            onChange={(event) => setKonfirmasi(event.target.value)}
            className="field"
            required
          />
        </div>
      </div>

      <p className="text-caption text-ink-soft">
        Minimal 8 karakter. Sesi Anda di perangkat lain akan berakhir.
      </p>

      <button type="submit" disabled={memproses} className="btn-primary btn-sm">
        {memproses ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
      </button>
    </form>
  );
}
