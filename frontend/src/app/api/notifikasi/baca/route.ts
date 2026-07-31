import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';

/**
 * Menandai notifikasi sudah dibaca.
 *
 * Tanpa `id`, seluruh notifikasi ditandai sekaligus.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let id: unknown = null;

  try {
    const isi = await request.json();
    id = (isi as { id?: unknown })?.id ?? null;
  } catch {
    // Badan kosong berarti "tandai semua".
  }

  const path =
    typeof id === 'string' && id.length > 0
      ? `/notifikasi/${encodeURIComponent(id)}/baca`
      : '/notifikasi/baca-semua';

  try {
    const { message } = await panggilApi(path, { method: 'POST' });

    return NextResponse.json({ success: true, message });
  } catch (galat) {
    const status = galat instanceof GalatApi ? galat.status : 503;
    const message =
      galat instanceof GalatApi
        ? galat.message
        : 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.';

    return NextResponse.json({ success: false, message }, { status });
  }
}
