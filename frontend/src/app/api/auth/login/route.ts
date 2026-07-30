import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';
import { NAMA_COOKIE_TOKEN, opsiCookieToken } from '@/lib/auth-cookie';

interface HasilLogin {
  token: string;
  kedaluwarsa_pada: string;
}

/**
 * Meneruskan permintaan masuk ke backend, lalu menyimpan token pada cookie
 * httpOnly. Token tidak pernah dikirim kembali ke browser dalam bentuk yang
 * dapat dibaca JavaScript.
 */
export async function POST(request: Request) {
  let muatan: unknown;

  try {
    muatan = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Permintaan tidak dapat dibaca.' },
      { status: 400 },
    );
  }

  try {
    const { data } = await panggilApi<HasilLogin>('/login', {
      method: 'POST',
      body: muatan,
      autentikasi: false,
    });

    (await cookies()).set(
      NAMA_COOKIE_TOKEN,
      data.token,
      opsiCookieToken(data.kedaluwarsa_pada),
    );

    return NextResponse.json({ success: true, message: 'Berhasil masuk.' });
  } catch (galat) {
    if (galat instanceof GalatApi) {
      return NextResponse.json(
        {
          success: false,
          message: galat.message,
          errors: galat.errors,
          reference: galat.reference,
        },
        { status: galat.status },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Terjadi gangguan saat memproses permintaan.' },
      { status: 500 },
    );
  }
}
