import 'server-only';

import { panggilApi } from '@/lib/api';
import type { StatusLaporan } from '@/lib/laporan';

/** Pengambil data ringkasan untuk dashboard dan monitoring. */

export interface KartuDashboard {
  laporan_hari_ini: number;
  laporan_bulan_ini: number;
  draf_belum_dikirim: number;
  menunggu_tinjauan: number;
}

export interface RingkasanDashboard {
  kartu: KartuDashboard;
  laporan_saya_hari_ini: {
    id: number;
    status: StatusLaporan;
    label_status: string;
    dapat_disunting: boolean;
  } | null;
  status_aktivitas: { status: string; label: string; jumlah: number }[];
  terbaru: {
    id: number;
    tanggal: string;
    status: StatusLaporan;
    label_status: string;
    penyusun: string;
    departemen: string;
  }[];
  /** Null bagi Staff — daftar rekan yang terlambat bukan haknya. */
  belum_lapor: { id: number; nama: string; departemen: string }[] | null;
}

export interface RingkasanMonitoring {
  rentang: { dari: string; sampai: string; jumlah_hari: number };
  anggota: {
    id: number;
    nama: string;
    departemen: string;
    jumlah_laporan: number;
    jumlah_draf: number;
    jumlah_ditinjau: number;
    hari_tanpa_laporan: number;
  }[];
}

export async function ambilRingkasanDashboard(): Promise<RingkasanDashboard> {
  const { data } = await panggilApi<RingkasanDashboard>('/dashboard');

  return data;
}

export async function ambilRingkasanMonitoring(
  query: URLSearchParams,
): Promise<RingkasanMonitoring> {
  const teks = query.toString();
  const { data } = await panggilApi<RingkasanMonitoring>(
    teks ? `/monitoring?${teks}` : '/monitoring',
  );

  return data;
}
