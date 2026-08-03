import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';
import { middleware } from '@/middleware';

const ASAL = 'https://daily.hbmnet.co.id';

function permintaan(jalur: string, denganToken: boolean): NextRequest {
  const request = new NextRequest(new URL(jalur, ASAL));

  if (denganToken) {
    request.cookies.set(NAMA_COOKIE_TOKEN, 'token-basi');
  }

  return request;
}

/** Nilai header Location, atau null bila jawabannya bukan pengalihan. */
function tujuan(jawaban: Response): string | null {
  return jawaban.status >= 300 && jawaban.status < 400 ? jawaban.headers.get('location') : null;
}

describe('middleware', () => {
  it('mengantar pengunjung tanpa token ke halaman masuk, sambil mengingat tujuannya', () => {
    const jawaban = middleware(permintaan('/laporan?status=draf', false));

    expect(tujuan(jawaban)).toBe(`${ASAL}/login?lanjut=%2Flaporan%3Fstatus%3Ddraf`);
  });

  it('mengantar pemegang token yang membuka halaman masuk kembali ke dashboard', () => {
    const jawaban = middleware(permintaan('/login', true));

    expect(tujuan(jawaban)).toBe(`${ASAL}/dashboard`);
  });

  /*
   * Cabang inilah yang membuat sesi berakhir tidak berputar tanpa henti.
   *
   * Halaman yang tokennya ditolak backend mengarah ke /login?sesi=berakhir.
   * Cookie basinya masih terpasang, jadi tanpa cabang ini middleware akan
   * memantulkan pengguna ke /dashboard, dashboard mendapat 401 lalu mengarah
   * ke /login lagi — berulang selamanya.
   */
  it('meloloskan penanda sesi berakhir dan membuang cookie basinya', () => {
    const jawaban = middleware(permintaan('/login?sesi=berakhir', true));

    expect(tujuan(jawaban)).toBeNull();

    // Diperiksa pada header yang benar-benar dikirim ke peramban, bukan pada
    // objek pembantunya — itulah yang menentukan cookie jadi terbuang.
    expect(jawaban.headers.get('set-cookie')).toBe(
      `${NAMA_COOKIE_TOKEN}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    );
  });

  it('membiarkan halaman masuk apa adanya ketika tidak ada token', () => {
    const jawaban = middleware(permintaan('/login?sesi=berakhir', false));

    expect(tujuan(jawaban)).toBeNull();
    expect(jawaban.headers.get('set-cookie')).toBeNull();
  });
});
