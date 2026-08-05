'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { hapusFotoProfil, unggahFotoProfil } from './actions';
import { PemotongFoto } from './pemotong-foto';

/** Sama dengan `FotoProfil::MAKS_BYTE` di backend. */
const MAKS_BYTE = 5 * 1024 * 1024;

const TIPE_DITERIMA = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Mengganti foto profil sendiri.
 *
 * ## Dipotong dulu, baru disimpan
 *
 * Bagian gambar yang dipakai adalah keputusan pemiliknya, bukan hasil tebakan
 * pemotongan tengah. Foto setengah badan yang dipotong otomatis hampir selalu
 * memotong wajahnya, dan sebelum ada pemotong ini satu-satunya jalan
 * memperbaikinya adalah mengedit berkasnya di luar aplikasi lalu mengunggah
 * ulang.
 *
 * Yang terkirim adalah hasil potongannya — persis yang terlihat di jendela
 * pemotong. Server tetap menggambar ulang gambarnya; lihat catatan pada
 * `App\Support\FotoProfil`.
 *
 * ## Ukuran dan jenis diperiksa dua kali
 *
 * Sekali di sini supaya jawabannya seketika, sekali di server karena
 * pemeriksaan di peramban bukan penjagaan — permintaan dapat dikirim tanpa
 * melewati halaman ini sama sekali.
 */
export function FotoProfil({ nama, fotoAwal }: { nama: string; fotoAwal: string | null }) {
  const router = useRouter();
  const berkasRef = useRef<HTMLInputElement>(null);

  const [terpilih, setTerpilih] = useState<File | null>(null);
  /*
   * Hasil potongan, bukan berkas aslinya. Diperbarui tiap kali geseran atau
   * perbesarannya berubah, sehingga tombol Simpan selalu mengirim persis yang
   * terlihat di jendela pemotong.
   */
  const [potongan, setPotongan] = useState<Blob | null>(null);
  const [pesan, setPesan] = useState<{ jenis: 'galat' | 'berhasil'; teks: string } | null>(null);
  const [memproses, setMemproses] = useState(false);

  // Referensi tetap: pemotongnya memakainya sebagai dependensi effect, dan
  // fungsi baru tiap render membuatnya memotong ulang tanpa henti.
  const terimaPotongan = useCallback((hasil: Blob | null) => setPotongan(hasil), []);

  function pilih(berkas: File | undefined) {
    setPesan(null);

    if (!berkas) return;

    if (!TIPE_DITERIMA.includes(berkas.type)) {
      setPesan({ jenis: 'galat', teks: 'Jenis gambar tidak diterima. Pakai JPG, PNG, atau WebP.' });

      return;
    }

    if (berkas.size > MAKS_BYTE) {
      setPesan({ jenis: 'galat', teks: 'Ukuran foto paling besar 5 MB.' });

      return;
    }

    setTerpilih(berkas);
    setPotongan(null);
  }

  function bersihkanPilihan() {
    setTerpilih(null);
    setPotongan(null);

    if (berkasRef.current) berkasRef.current.value = '';
  }

  async function simpan() {
    if (!potongan) return;

    setMemproses(true);
    setPesan(null);

    const formulir = new FormData();
    // Nama berkasnya tidak dipakai server — nama di disk selalu dibuat acak —
    // tetapi tetap perlu ada agar terbaca sebagai unggahan berkas, bukan teks.
    formulir.append('foto', potongan, 'foto-profil.jpg');

    const hasil = await unggahFotoProfil(formulir);

    setMemproses(false);
    setPesan({
      jenis: hasil.berhasil ? 'berhasil' : 'galat',
      teks: hasil.errors?.foto?.[0] ?? hasil.pesan,
    });

    if (hasil.berhasil) {
      bersihkanPilihan();
      router.refresh();
    }
  }

  async function hapus() {
    setMemproses(true);
    setPesan(null);

    const hasil = await hapusFotoProfil();

    setMemproses(false);
    setPesan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', teks: hasil.pesan });

    if (hasil.berhasil) {
      bersihkanPilihan();
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {pesan && <Alert jenis={pesan.jenis} pesan={pesan.teks} />}

      <div className="flex flex-wrap items-start gap-4">
        {terpilih ? (
          <PemotongFoto berkas={terpilih} onSiap={terimaPotongan} />
        ) : (
          <Avatar nama={nama} foto={fotoAwal} ukuran="xl" />
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => berkasRef.current?.click()}
              disabled={memproses}
              className="btn-ghost btn-sm"
            >
              <Camera aria-hidden="true" className="size-3.5" />
              {terpilih ? 'Ganti Foto' : 'Pilih Foto'}
            </button>

            {terpilih && (
              <>
                <button
                  type="button"
                  onClick={() => void simpan()}
                  disabled={memproses || potongan === null}
                  className="btn-primary btn-sm"
                >
                  {memproses ? 'Menyimpan…' : 'Simpan Foto'}
                </button>
                <button
                  type="button"
                  onClick={bersihkanPilihan}
                  disabled={memproses}
                  className="btn-ghost btn-sm"
                >
                  Batal
                </button>
              </>
            )}

            {fotoAwal && !terpilih && (
              <button
                type="button"
                onClick={() => void hapus()}
                disabled={memproses}
                className="btn-ghost btn-sm text-danger-text"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Hapus Foto
              </button>
            )}
          </div>

          <p className="text-caption text-ink-soft">JPG, PNG, atau WebP. Paling besar 5 MB.</p>

          {terpilih ? (
            <p className="text-caption text-ink-muted">
              Atur dulu bagian yang dipakai, lalu tekan{' '}
              <span className="font-medium">Simpan Foto</span>.
            </p>
          ) : (
            <p className="text-caption text-ink-soft">
              Foto ikut tampil pada bilah navigasi dan kartu identitas Anda.
            </p>
          )}
        </div>
      </div>

      {/*
        Isian berkasnya disembunyikan dari mata, bukan dari pohon aksesibilitas:
        `hidden` membuatnya tak terjangkau papan ketik maupun pembaca layar,
        sedangkan `sr-only` tetap dapat difokus dan dijalankan.
      */}
      <input
        ref={berkasRef}
        type="file"
        accept={TIPE_DITERIMA.join(',')}
        onChange={(peristiwa) => pilih(peristiwa.target.files?.[0])}
        aria-label="Pilih berkas foto profil"
        className="sr-only"
      />
    </div>
  );
}
