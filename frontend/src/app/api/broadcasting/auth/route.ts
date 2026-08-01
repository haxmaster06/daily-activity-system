import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { BASE_URL_BACKEND } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Meneruskan otorisasi channel privat ke backend.
 *
 * Echo berjalan di peramban, sedangkan token akses berada di cookie httpOnly
 * yang sengaja tidak dapat dibaca JavaScript. Karena itu peramban tidak dapat
 * memanggil `/broadcasting/auth` sendiri — tokennya dipasang di sini, di sisi
 * server, tepat sebelum permintaan diteruskan.
 *
 * Keputusan boleh-tidaknya tetap milik backend (`routes/channels.php`); berkas
 * ini hanya membawa tokennya.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;

  if (!token) {
    return NextResponse.json(
      { message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
      { status: 401 },
    );
  }

  /*
   * Badan permintaan diteruskan apa adanya. Echo mengirim `socket_id` dan
   * `channel_name` sebagai form-encoded, dan tanda tangan yang dihitung
   * backend bergantung pada keduanya persis seperti dikirim.
   */
  const badan = await request.text();

  let response: Response;

  try {
    response = await fetch(`${BASE_URL_BACKEND}/broadcasting/auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type':
          request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
      },
      body: badan,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'Tidak dapat terhubung ke server notifikasi.' },
      { status: 503 },
    );
  }

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
