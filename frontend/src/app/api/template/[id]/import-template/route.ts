import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Bentuk kolomnya mengikuti template yang sedang berlaku dan daftar master yang
 * sedang ada, sehingga berkasnya tidak boleh disajikan dari cache.
 */
export const dynamic = 'force-dynamic';

/**
 * Meneruskan unduhan template import laporan dari backend.
 *
 * Token akses berada di cookie httpOnly, sehingga peramban tidak dapat memanggil
 * backend secara langsung. Berkasnya dialirkan apa adanya.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { success: false, message: 'Template tidak dikenal.' },
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
    response = await fetch(`${BASE_URL_BACKEND}/api/template/${id}/import/template`, {
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
