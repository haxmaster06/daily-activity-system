import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';

/**
 * Menghapus notifikasi.
 *
 * Satu route untuk dua hal yang berdekatan: `id` menghapus satu notifikasi,
 * `bersihkan` membuang yang sudah dibaca — atau seluruhnya bila `semua` diminta.
 *
 * Memakai POST, bukan DELETE. Route handler ini hanya membawa token yang
 * tersimpan di cookie httpOnly; badan permintaannya tetap diperlukan, dan
 * DELETE berbadan pesan ditangani berbeda-beda oleh proksi di jalur.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let isi: { id?: unknown; bersihkan?: unknown; semua?: unknown } = {};

  try {
    isi = (await request.json()) as typeof isi;
  } catch {
    // Badan kosong: tidak ada yang perlu dikerjakan.
  }

  const path =
    typeof isi.id === 'string' && isi.id.length > 0
      ? `/notifikasi/${encodeURIComponent(isi.id)}`
      : isi.bersihkan
        ? `/notifikasi/bersihkan${isi.semua ? '?semua=1' : ''}`
        : null;

  if (path === null) {
    return NextResponse.json(
      { success: false, message: 'Tidak ada notifikasi yang ditunjuk.' },
      { status: 422 },
    );
  }

  try {
    const { message, data } = await panggilApi(path, { method: 'DELETE' });

    return NextResponse.json({ success: true, message, data });
  } catch (galat) {
    const status = galat instanceof GalatApi ? galat.status : 503;
    const message =
      galat instanceof GalatApi
        ? galat.message
        : 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.';

    return NextResponse.json({ success: false, message }, { status });
  }
}
