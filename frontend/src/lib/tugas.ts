/**
 * Bentuk kartu papan progres harian.
 *
 * Tanpa `server-only` — komponen client memakainya untuk merender papan.
 * Pengambil datanya ada di `tugas-server.ts`.
 */

export type StatusTugas = 'belum_mulai' | 'dalam_proses' | 'selesai';

export type Prioritas = 'rendah' | 'sedang' | 'tinggi';

export interface Tugas {
  id: number;
  judul: string;
  keterangan: string | null;
  status: StatusTugas;
  label_status: string;
  prioritas: Prioritas | null;
  label_prioritas: string | null;
  /** ISO `YYYY-MM-DD`. Pemformatan Bahasa Indonesia lewat `lib/format`. */
  target_selesai: string | null;
  lewat_target: boolean;
  urutan: number;
  departemen: { id: number; nama?: string | null };
  penanggung_jawab?: { id: number; nama: string } | null;
  laporan?: { id: number; tanggal: string }[];
  jumlah_laporan?: number;
}

export interface KolomPapan {
  status: StatusTugas;
  label: string;
  kartu: Tugas[];
}

/**
 * Warna badge prioritas.
 *
 * Selalu disertai teks, tidak pernah warna saja — §9 melarang penanda yang
 * hanya dibedakan warna.
 */
export const RAGAM_PRIORITAS: Record<Prioritas, string> = {
  rendah: 'bg-surface-muted text-ink-muted',
  sedang: 'bg-warning-subtle text-warning-text',
  tinggi: 'bg-danger-subtle text-danger-text',
};

export const LABEL_PRIORITAS: Record<Prioritas, string> = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
};
