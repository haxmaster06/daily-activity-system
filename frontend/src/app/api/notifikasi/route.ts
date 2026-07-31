import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';
import type { KotakNotifikasi } from '@/lib/notifikasi';

/**
 * Notifikasi milik pengguna yang sedang masuk.
 *
 * Lonceng adalah komponen client, sehingga tidak dapat memanggil backend
 * langsung — tokennya berada di cookie httpOnly.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = await panggilApi<KotakNotifikasi>('/notifikasi');

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (galat) {
    const status = galat instanceof GalatApi ? galat.status : 503;

    // Lonceng yang gagal dimuat tidak boleh mengganggu halaman: kembalikan
    // kotak kosong, bukan galat yang harus ditangani setiap pemanggil.
    return NextResponse.json(
      { jumlah_belum_dibaca: 0, daftar: [] } satisfies KotakNotifikasi,
      { status: status === 401 ? 401 : 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
