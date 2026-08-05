'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Combobox, type OpsiCombobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Modal } from '@/components/ui/modal';
import { Select, type OpsiSelect } from '@/components/ui/select';
import type { StatusTugas, Tugas } from '@/lib/tugas';
import { buatTugas, perbaruiTugas } from './actions';

interface TugasDialogProps {
  terbuka: boolean;
  onTutup: () => void;
  /** Kosong berarti menambah kartu baru. */
  tugas: Tugas | null;
  departemen: OpsiSelect[];
  pengguna: OpsiCombobox[];
  laporan: OpsiCombobox[];
  departemenBawaan: number | null;
  onSelesai: () => void;
}

const OPSI_STATUS: OpsiSelect[] = [
  { nilai: 'belum_mulai', label: 'Belum Mulai' },
  { nilai: 'dalam_proses', label: 'Dalam Proses' },
  { nilai: 'selesai', label: 'Selesai' },
];

const OPSI_PRIORITAS: OpsiSelect[] = [
  { nilai: 'rendah', label: 'Rendah' },
  { nilai: 'sedang', label: 'Sedang' },
  { nilai: 'tinggi', label: 'Tinggi' },
];

/** Penyaringan sisi peramban; daftarnya pendek dan sudah dibatasi server. */
function saring(opsi: OpsiCombobox[], teks: string): OpsiCombobox[] {
  const kata = teks.trim().toLowerCase();
  if (kata === '') return opsi;

  return opsi.filter(
    (satu) =>
      satu.label.toLowerCase().includes(kata) ||
      (satu.keterangan?.toLowerCase().includes(kata) ?? false),
  );
}

/**
 * Menambah dan menyunting satu kartu progres.
 *
 * Delapan isian — masih modal (§7.1). Tidak ada lampiran; bukti pengerjaannya
 * berupa tautan ke laporan harian, bukan berkas yang diunggah ulang.
 */
export function TugasDialog({
  terbuka,
  onTutup,
  tugas,
  departemen,
  pengguna,
  laporan,
  departemenBawaan,
  onSelesai,
}: TugasDialogProps) {
  const [judul, setJudul] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [departemenId, setDepartemenId] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState<OpsiCombobox | null>(null);
  const [status, setStatus] = useState<StatusTugas>('belum_mulai');
  const [prioritas, setPrioritas] = useState('');
  const [targetSelesai, setTargetSelesai] = useState<string | null>(null);
  const [tertaut, setTertaut] = useState<OpsiCombobox[]>([]);

  const [ketikPengguna, setKetikPengguna] = useState('');
  const [ketikLaporan, setKetikLaporan] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!terbuka) return;

    setJudul(tugas?.judul ?? '');
    setKeterangan(tugas?.keterangan ?? '');
    setDepartemenId(
      String(tugas?.departemen.id ?? departemenBawaan ?? departemen[0]?.nilai ?? ''),
    );
    setPenanggungJawab(
      tugas?.penanggung_jawab
        ? { id: tugas.penanggung_jawab.id, label: tugas.penanggung_jawab.nama }
        : null,
    );
    setStatus(tugas?.status ?? 'belum_mulai');
    setPrioritas(tugas?.prioritas ?? '');
    setTargetSelesai(tugas?.target_selesai ?? null);
    setTertaut(
      (tugas?.laporan ?? []).map((satu) => ({
        id: satu.id,
        label: laporan.find((opsi) => opsi.id === satu.id)?.label ?? `Laporan #${satu.id}`,
      })),
    );

    setKetikPengguna('');
    setKetikLaporan('');
    setGalat(null);
  }, [terbuka, tugas, departemen, departemenBawaan, laporan]);

  // Laporan yang sudah tertaut tidak ditawarkan lagi.
  const laporanTersisa = useMemo(
    () => laporan.filter((satu) => !tertaut.some((sudah) => sudah.id === satu.id)),
    [laporan, tertaut],
  );

  async function simpan() {
    if (judul.trim() === '') {
      setGalat('Judul tugas belum diisi.');

      return;
    }

    if (departemenId === '') {
      setGalat('Departemen belum dipilih.');

      return;
    }

    setMemproses(true);
    setGalat(null);

    const muatan = {
      title: judul.trim(),
      description: keterangan.trim() || null,
      department_id: Number(departemenId),
      penanggung_jawab_id: penanggungJawab ? Number(penanggungJawab.id) : null,
      status,
      prioritas: prioritas || null,
      target_selesai: targetSelesai,
      laporan_id: tertaut.map((satu) => Number(satu.id)),
    };

    const hasil = tugas ? await perbaruiTugas(tugas.id, muatan) : await buatTugas(muatan);

    setMemproses(false);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);

      return;
    }

    onSelesai();
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={tugas ? `Ubah ${tugas.judul}` : 'Tambah Tugas'}
      lebar="lebar"
      aksi={
        <>
          <button type="button" onClick={onTutup} className="btn-ghost btn-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpan()}
            disabled={memproses}
            className="btn-primary btn-sm"
          >
            {memproses ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {galat && <Alert jenis="galat" pesan={galat} />}

        <div>
          <label htmlFor="judul-tugas" className="field-label">
            Judul
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          </label>
          <input
            id="judul-tugas"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={150}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="keterangan-tugas" className="field-label">
            Keterangan
          </label>
          <textarea
            id="keterangan-tugas"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            maxLength={500}
            rows={2}
            className="field h-auto py-1.5"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            id="departemen-tugas"
            label="Departemen"
            nilai={departemenId}
            onUbah={setDepartemenId}
            opsi={departemen}
            placeholder="Pilih departemen..."
            nonaktif={departemen.length <= 1}
            wajib
          />

          <Combobox
            label="Penanggung Jawab"
            opsi={saring(pengguna, ketikPengguna)}
            nilai={penanggungJawab}
            onUbah={setPenanggungJawab}
            onKetik={setKetikPengguna}
            placeholder="Cari nama..."
          />

          <Select
            id="status-tugas"
            label="Status"
            nilai={status}
            onUbah={(nilai) => setStatus(nilai as StatusTugas)}
            opsi={OPSI_STATUS}
          />

          <Select
            id="prioritas-tugas"
            label="Prioritas"
            nilai={prioritas}
            onUbah={setPrioritas}
            opsi={OPSI_PRIORITAS}
            placeholder="Tanpa prioritas"
          />
        </div>

        <DatePicker
          label="Target Selesai"
          nilai={targetSelesai}
          onUbah={setTargetSelesai}
          bantuan="Kartu yang melewati target diberi penanda di papan."
        />

        <div>
          <Combobox
            label="Laporan Terkait"
            opsi={saring(laporanTersisa, ketikLaporan)}
            nilai={null}
            onUbah={(pilihan) => {
              if (pilihan) setTertaut((sebelumnya) => [...sebelumnya, pilihan]);
            }}
            onKetik={setKetikLaporan}
            placeholder="Cari tanggal laporan..."
            bantuan="Laporan harian yang menjadi bukti pengerjaan tugas ini."
          />

          {tertaut.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tertaut.map((satu) => (
                <li key={satu.id}>
                  <span className="inline-flex items-center gap-1 rounded-control bg-surface-muted px-2 py-1 text-caption text-ink-muted">
                    {satu.label}
                    <button
                      type="button"
                      onClick={() =>
                        setTertaut((sebelumnya) =>
                          sebelumnya.filter((sisa) => sisa.id !== satu.id),
                        )
                      }
                      aria-label={`Lepas tautan ${satu.label}`}
                      className="grid size-4 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface hover:text-ink"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
