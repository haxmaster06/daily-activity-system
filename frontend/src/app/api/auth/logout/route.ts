import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { panggilApi } from '@/lib/api';
import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Mencabut token di backend lalu menghapus cookie.
 *
 * Cookie tetap dihapus walau backend gagal dihubungi, agar pengguna tidak
 * terjebak dalam sesi yang tidak bisa ditinggalkan.
 */
export async function POST() {
  try {
    await panggilApi('/logout', { method: 'POST' });
  } catch {
    // Diabaikan dengan sengaja — lihat catatan di atas.
  }

  (await cookies()).delete(NAMA_COOKIE_TOKEN);

  return NextResponse.json({ success: true, message: 'Berhasil keluar.' });
}
