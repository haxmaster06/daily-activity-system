import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Meneruskan foto profil dari backend.
 *
 * Token akses berada di cookie httpOnly, sehingga `<img src>` tidak dapat
 * menyertakannya sendiri. Route ini membawa tokennya — izin dan keberadaan
 * berkasnya tetap diputuskan backend.
 *
 * Fotonya **tidak** disajikan sebagai berkas publik. Menaruhnya di
 * `storage/app/public` memang lebih sederhana, tetapi berarti foto tiap
 * karyawan dapat diambil siapa pun yang menebak alamatnya, tanpa sesi.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;

  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL_BACKEND}/api/pengguna/${id}/foto`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'image/*' },
      cache: 'no-store',
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }

  /*
   * Galat dijawab tanpa badan pesan. Sasarannya sebuah `<img>`, dan JSON yang
   * dikirim ke sana hanya berakhir sebagai gambar rusak — sementara isinya
   * tetap terbaca siapa pun yang membuka alamatnya langsung.
   */
  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',

      /*
       * `private` — proksi bersama tidak boleh menyimpan foto seseorang untuk
       * disajikan kepada pengguna lain. Umurnya pendek supaya foto yang baru
       * diganti langsung terlihat berganti.
       */
      'Cache-Control': 'private, max-age=60',
    },
  });
}
