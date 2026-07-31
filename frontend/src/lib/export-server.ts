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
  baris: Record<string, string | number | null>[];
  jumlah_baris: number;
  jumlah_laporan: number;
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
