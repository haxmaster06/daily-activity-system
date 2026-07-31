'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Send, ShieldCheck } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { SpectacularButton } from '@/components/ui/spectacular-button';
import type { Laporan } from '@/lib/laporan';
import { kirimLaporan, tinjauLaporan } from '../actions';

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
        pesan="Setelah dikirim, laporan menjadi catatan dan tidak dapat disunting lagi. Pastikan isinya sudah benar."
        labelAksi="Kirim"
      />

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
          <textarea
            id="catatan-tinjauan"
            rows={3}
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            maxLength={255}
            placeholder="Mis. Sudah sesuai, lanjutkan."
            className="w-full rounded-input border border-line bg-surface px-2.5 py-2 text-body-lg text-ink transition-colors duration-fast placeholder:text-ink-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          <span className="mt-1 block text-caption text-ink-soft">
            Maksimal 255 karakter.
          </span>
        </div>
      </Modal>
    </>
  );
}
