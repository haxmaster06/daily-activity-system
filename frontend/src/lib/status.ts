import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileEdit,
  Loader,
  Send,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Sumber tunggal untuk badge status (standar §3.3).
 *
 * Warna status wajib sama di mana pun ditampilkan, dan tidak boleh dibedakan
 * lewat warna saja — tiap status membawa ikon dan label teks (standar §20.3).
 */

export type StatusAktivitas = 'belum_mulai' | 'dalam_proses' | 'selesai';
export type StatusLaporan = 'draf' | 'terkirim' | 'disetujui';
export type StatusPelaporan = 'sudah_laporan' | 'belum_laporan';
export type KunciStatus = StatusAktivitas | StatusLaporan | StatusPelaporan;

export interface TampilanStatus {
  label: string;
  icon: LucideIcon;
  /** Kelas untuk badge: latar tonal + teks berkontras tinggi pada rona yang sama. */
  className: string;
}

export const STATUS: Record<KunciStatus, TampilanStatus> = {
  belum_mulai: {
    label: 'Belum Mulai',
    icon: Circle,
    className: 'bg-surface-sunken text-ink-muted',
  },
  dalam_proses: {
    label: 'Dalam Proses',
    icon: Loader,
    className: 'bg-accent-subtle text-accent-text',
  },
  selesai: {
    label: 'Selesai',
    icon: CheckCircle2,
    className: 'bg-secondary-subtle text-secondary-text',
  },
  draf: {
    label: 'Draf',
    icon: FileEdit,
    className: 'bg-accent-subtle text-accent-text',
  },
  terkirim: {
    label: 'Terkirim',
    icon: Send,
    className: 'bg-primary-subtle text-primary-text',
  },
  disetujui: {
    label: 'Disetujui',
    icon: ShieldCheck,
    className: 'bg-secondary-subtle text-secondary-text',
  },
  sudah_laporan: {
    label: 'Sudah Laporan',
    icon: CheckCircle2,
    className: 'bg-secondary-subtle text-secondary-text',
  },
  belum_laporan: {
    label: 'Belum Laporan',
    icon: AlertTriangle,
    className: 'bg-danger-subtle text-danger-text',
  },
};

/** Status yang tidak dikenal tetap tampil rapi, tanpa memunculkan nilai mentah database. */
export function tampilanStatus(kunci: string): TampilanStatus {
  return (
    STATUS[kunci as KunciStatus] ?? {
      label: 'Tidak Diketahui',
      icon: Circle,
      className: 'bg-surface-sunken text-ink-muted',
    }
  );
}
