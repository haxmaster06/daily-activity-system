'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, Pencil, Send, ShieldCheck } from 'lucide-react';

import { EditorKaya } from '@/components/ui/editor-kaya';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { SpectacularButton } from '@/components/ui/spectacular-button';
import { hariIniApi } from '@/lib/format';
import type { Laporan } from '@/lib/laporan';
import { DatePicker } from '@/components/ui/date-picker';
import { duplikatLaporan, kirimLaporan, tinjauLaporan } from '../actions';

interface TindakanLaporanProps {
  laporan: Laporan;
  /** Pengguna boleh menandai laporan ini sudah ditinjau. */
  bolehMeninjau: boolean;
}

/**
 * Tindakan pada satu laporan: sunting, kirim, dan tandai sudah ditinjau.
 *
 * Tombol yang tidak berlaku disembunyikan, bukan ditampilkan dalam keadaan
 * mati — tombol mati menimbulkan pertanyaan yang tidak terjawab. Izin
 * sesungguhnya tetap ditegakkan DailyReportPolicy di server.
 */
export function TindakanLaporan({ laporan, bolehMeninjau }: TindakanLaporanProps) {
  const router = useRouter();

  const [konfirmasiKirim, setKonfirmasiKirim] = useState(false);
  const [dialogDuplikat, setDialogDuplikat] = useState(false);
  const [tanggalDuplikat, setTanggalDuplikat] = useState<string | null>(
    hariIniApi(),
  );
  const [dialogTinjau, setDialogTinjau] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [memproses, setMemproses] = useState(false);
  const [pemberitahuan, setPemberitahuan] = useState<{
    jenis: 'galat' | 'berhasil';
    pesan: string;
  } | null>(null);

  async function kirim() {
    const hasil = await kirimLaporan(laporan.id);

    setKonfirmasiKirim(false);
    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) router.refresh();
  }

  async function duplikat() {
    if (tanggalDuplikat === null) {
      setPemberitahuan({ jenis: 'galat', pesan: 'Tanggal tujuan belum dipilih.' });

      return;
    }

    setMemproses(true);
    const hasil = await duplikatLaporan(laporan.id, tanggalDuplikat);
    setMemproses(false);

    if (!hasil.berhasil) {
      setPemberitahuan({ jenis: 'galat', pesan: hasil.pesan });

      return;
    }

    setDialogDuplikat(false);

    // Langsung dibuka: angkanya sengaja dikosongkan dan memang perlu segera
    // dilengkapi, jadi menutup dialog lalu diam justru meninggalkan draf
    // setengah jadi yang mudah terlupa.
    if (hasil.idBaru) router.push(`/laporan/${hasil.idBaru}/ubah`);
    else router.refresh();
  }

  async function tinjau() {
    setMemproses(true);
    const hasil = await tinjauLaporan(laporan.id, catatan);
    setMemproses(false);

    setPemberitahuan({ jenis: hasil.berhasil ? 'berhasil' : 'galat', pesan: hasil.pesan });

    if (hasil.berhasil) {
      setDialogTinjau(false);
      setCatatan('');
      router.refresh();
    }
  }

  return (
    <>
      {pemberitahuan && (
        <Alert jenis={pemberitahuan.jenis} pesan={pemberitahuan.pesan} className="mb-3" />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {laporan.dapat_disunting && (
          <>
            <Link href={`/laporan/${laporan.id}/ubah`} className="btn-ghost btn-sm">
              <Pencil aria-hidden="true" className="size-4" />
              Sunting
            </Link>

            {/* Aksi utama halaman ini — satu-satunya Spectacular Button. */}
            <SpectacularButton onClick={() => setKonfirmasiKirim(true)}>
              <Send aria-hidden="true" className="size-4" />
              Kirim Laporan
            </SpectacularButton>
          </>
        )}

        {/*
          Duplikat tersedia pada laporan apa pun milik sendiri, termasuk yang
          sudah dikirim — laporan lama yang sudah selesai justru yang paling
          sering ingin ditiru.
        */}
        <button
          type="button"
          onClick={() => setDialogDuplikat(true)}
          className="btn-ghost btn-sm"
        >
          <Copy aria-hidden="true" className="size-4" />
          Duplikat
        </button>

        {bolehMeninjau && (
          <button
            type="button"
            onClick={() => setDialogTinjau(true)}
            className="btn-primary btn-sm"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            Tandai Sudah Ditinjau
          </button>
        )}
      </div>

      <ConfirmDialog
        terbuka={konfirmasiKirim}
        onTutup={() => setKonfirmasiKirim(false)}
        onSetuju={kirim}
        judul="Kirim Laporan"
        pesan="Laporan akan tampil pada monitoring atasan Anda. Masih dapat diperbaiki setelah dikirim bila ada yang keliru."
        labelAksi="Kirim"
      />

      <Modal
        terbuka={dialogDuplikat}
        onTutup={() => setDialogDuplikat(false)}
        judul="Duplikat Laporan"
        keterangan="Aktivitas, keterangan, dan pilihan tersalin. Kolom angka dan status sengaja dikosongkan agar tidak terbawa dari laporan sebelumnya."
        aksi={
          <>
            <button
              type="button"
              onClick={() => setDialogDuplikat(false)}
              className="btn-ghost btn-sm"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void duplikat()}
              disabled={memproses}
              className="btn-primary btn-sm"
            >
              {memproses ? 'Menduplikat...' : 'Duplikat'}
            </button>
          </>
        }
      >
        <DatePicker
          label="Tanggal laporan baru"
          nilai={tanggalDuplikat}
          onUbah={setTanggalDuplikat}
        />
        <p className="mt-1 text-caption text-ink-soft">
          Tanggal yang sudah punya laporan tidak dapat dipilih — bukalah laporan itu untuk
          melanjutkan.
        </p>
      </Modal>

      <Modal
        terbuka={dialogTinjau}
        onTutup={() => setDialogTinjau(false)}
        judul="Tandai Sudah Ditinjau"
        keterangan="Catatan bersifat opsional dan akan terlihat oleh penyusun laporan."
        aksi={
          <>
            <button
              type="button"
              onClick={() => setDialogTinjau(false)}
              className="btn-ghost btn-sm"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void tinjau()}
              disabled={memproses}
              className="btn-primary btn-sm"
            >
              {memproses ? 'Menyimpan...' : 'Tandai Ditinjau'}
            </button>
          </>
        }
      >
        <div>
          <label htmlFor="catatan-tinjauan" className="field-label">
            Catatan Tinjauan
          </label>
          <EditorKaya
            id="catatan-tinjauan"
            nilai={catatan || null}
            onUbah={(html) => setCatatan(html ?? '')}
            label="Catatan Tinjauan"
            placeholder="Mis. Sudah sesuai, lanjutkan."
            tinggiMinimal="5rem"
          />
          <span className="mt-1 block text-caption text-ink-soft">
            Maksimal 255 karakter.
          </span>
        </div>
      </Modal>
    </>
  );
}
