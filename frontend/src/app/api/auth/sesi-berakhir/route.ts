import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Membersihkan sesi yang tokennya sudah tidak berlaku, lalu mengantar
 * pengguna ke halaman masuk.
 *
 * Diperlukan karena Server Component tidak boleh menghapus cookie. Tanpa
 * jalur ini, cookie basi membuat middleware dan layout saling melempar:
 * middleware melihat cookie lalu mengizinkan halaman, layout mendapat 401
 * lalu mengarahkan ke /login, dan middleware mengembalikannya lagi.
 */
export async function GET(request: Request) {
  (await cookies()).delete(NAMA_COOKIE_TOKEN);

  const tujuan = new URL('/login', request.url);
  tujuan.searchParams.set('sesi', 'berakhir');

  return NextResponse.redirect(tujuan);
}
