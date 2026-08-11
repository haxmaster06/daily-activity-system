import 'server-only';

import { panggilApi } from '@/lib/api';

/** Pratinjau isi export. */

export interface KolomExport {
  kunci: string;
  label: string;
  satuan: string | null;
}

export interface PratinjauExport {
  rentang: { dari: string; sampai: string; label: string };
  template: { id: number; kode: string; nama: string } | null;
  kolom: KolomExport[];
  /**
   * Kolom yang sudah dipecah per halaman cetak; tiap kelompok sudah memuat
   * kolom identitasnya sendiri.
   *
   * Dihitung server supaya hasil cetak layar dan berkas PDF memecah dengan cara
   * yang sama persis.
   */
  kelompok_kolom: KolomExport[][];
  baris: Record<string, string | number | null>[];
  jumlah_baris: number;
  jumlah_laporan: number;
  /**
   * Template lain yang ada pada hasil penyaringan tetapi tidak ikut terexport.
   *
   * Satu berkas export hanya memuat satu bentuk tabel, sehingga laporan
   * bertemplate lain memang tertinggal. Ini yang membuat keterangannya dapat
   * menyebutkan berapa dan template apa saja.
   */
  template_lain: { id: number; nama: string; jumlah_baris: number; jumlah_laporan: number }[];
  /** Data melebihi batas per berkas; yang tampil hanya bagian awalnya. */
  terpotong: boolean;
}

export async function ambilPratinjauExport(
  query: URLSearchParams,
): Promise<PratinjauExport> {
  const teks = query.toString();
  const { data } = await panggilApi<PratinjauExport>(
    teks ? `/export/pratinjau?${teks}` : '/export/pratinjau',
  );

  return data;
}
