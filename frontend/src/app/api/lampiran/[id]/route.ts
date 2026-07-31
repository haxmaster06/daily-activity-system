import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Meneruskan unduhan lampiran dari backend.
 *
 * Token akses berada di cookie httpOnly, sehingga peramban tidak dapat
 * memanggil backend secara langsung. Izinnya tetap diperiksa backend — route
 * ini hanya membawa tokennya, bukan memutuskan apa pun.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { success: false, message: 'Lampiran tidak dikenal.' },
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

  let response: Response;

  try {
    response = await fetch(`${BASE_URL_BACKEND}/api/lampiran/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.' },
      { status: 503 },
    );
  }

  if (!response.ok) {
    // Galat dari backend sudah berbahasa Indonesia; diteruskan apa adanya.
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',

      /*
       * Disposisi dan nosniff diteruskan apa adanya. Lampiran dapat berupa
       * berkas Office yang memuat makro; peramban tidak boleh membukanya
       * sendiri, dan tidak boleh menebak tipe isinya.
       */
      'Content-Disposition': response.headers.get('content-disposition') ?? 'attachment',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
