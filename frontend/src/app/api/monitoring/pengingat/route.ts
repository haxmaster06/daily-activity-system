import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';

/**
 * Mengirim pengingat laporan kepada seorang anggota tim.
 *
 * Seluruh pembatasan — role, departemen, satu pengingat per hari — ditegakkan
 * backend. Route Handler ini hanya meneruskan, dan meneruskan pesan galatnya
 * apa adanya karena sudah berbahasa Indonesia dan siap ditampilkan.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let badan: unknown;

  try {
    badan = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Permintaan tidak dikenali.' },
      { status: 400 },
    );
  }

  try {
    const { message } = await panggilApi('/monitoring/pengingat', {
      method: 'POST',
      body: badan,
    });

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
