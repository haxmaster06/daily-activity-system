import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Template import bergantung pada isi daftar induk yang sedang ada, sehingga
 * tidak boleh disajikan dari cache.
 */
export const dynamic = 'force-dynamic';

/**
 * Meneruskan unduhan template import dari backend.
 *
 * Token akses berada di cookie httpOnly, sehingga peramban tidak dapat memanggil
 * backend secara langsung. Berkasnya dialirkan apa adanya — tidak disimpan
 * sementara di server Next, dan tidak dimuat seluruhnya ke memori.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jenis: string }> },
) {
  const { jenis } = await params;

  const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
      { status: 401 },
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL_BACKEND}/api/master/${encodeURIComponent(jenis)}/template-import`,
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
      'Content-Disposition': response.headers.get('content-disposition') ?? 'attachment',
      'Cache-Control': 'no-store',
    },
  });
}
