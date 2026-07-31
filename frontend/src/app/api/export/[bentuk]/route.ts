import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Berkas export tidak pernah boleh disajikan dari cache: isinya bergantung pada
 * penyaringan dan pada jangkauan data milik pengguna yang meminta.
 */
export const dynamic = 'force-dynamic';

/** Bentuk berkas yang boleh diminta. */
const BENTUK_SAH = ['excel', 'pdf'] as const;

/**
 * Meneruskan unduhan berkas export dari backend.
 *
 * Token akses berada di cookie httpOnly, sehingga peramban tidak dapat
 * memanggil backend secara langsung. Berkasnya dialirkan apa adanya —
 * tidak disimpan sementara di server Next, dan tidak dimuat seluruhnya ke
 * memori.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bentuk: string }> },
) {
  const { bentuk } = await params;

  if (!BENTUK_SAH.includes(bentuk as (typeof BENTUK_SAH)[number])) {
    return NextResponse.json(
      { success: false, message: 'Bentuk berkas tidak dikenal.' },
      { status: 404 },
    );
  }

  const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
      { status: 401 },
    );
  }

  // Hanya parameter penyaringan yang diteruskan; sisanya diabaikan.
  const asal = new URL(request.url);
  const query = new URLSearchParams();
  for (const kunci of ['dari', 'sampai', 'status', 'departemen_id', 'pengguna_id', 'template_id']) {
    const nilai = asal.searchParams.get(kunci);
    if (nilai) query.set(kunci, nilai);
  }

  const teks = query.toString();

  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL_BACKEND}/api/export/${bentuk}${teks ? `?${teks}` : ''}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: '*/*' }, cache: 'no-store' },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.' },
      { status: 503 },
    );
  }

  if (!response.ok) {
    // Galat dari backend sudah berbahasa Indonesia; diteruskan apa adanya.
    const isi = await response.text();

    return new NextResponse(isi, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition':
        response.headers.get('content-disposition') ?? 'attachment',
      'Cache-Control': 'no-store',
    },
  });
}
