import { NextResponse, type NextRequest } from 'next/server';

import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Penjaga rute tingkat pertama.
 *
 * Middleware hanya memeriksa keberadaan cookie — cukup untuk mengarahkan
 * pengunjung yang jelas belum masuk tanpa memanggil backend pada setiap
 * navigasi. Pemeriksaan yang sebenarnya tetap dilakukan backend pada tiap
 * permintaan API, dan tiap halaman memverifikasi sesi lewat `penggunaSaatIni`.
 */
export function middleware(request: NextRequest) {
  const punyaToken = Boolean(request.cookies.get(NAMA_COOKIE_TOKEN)?.value);
  const { pathname, search } = request.nextUrl;
  const halamanMasuk = pathname === '/login';

  if (!punyaToken && !halamanMasuk) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = '/login';
    tujuan.search = '';

    // Simpan halaman yang dituju agar pengguna kembali ke sana setelah masuk.
    if (pathname !== '/') {
      tujuan.searchParams.set('lanjut', `${pathname}${search}`);
    }

    return NextResponse.redirect(tujuan);
  }

  if (punyaToken && halamanMasuk) {
    /*
     * Cookie masih ada tetapi tokennya sudah ditolak backend — halaman yang
     * mendapat penolakan itulah yang memasang penanda ini. Cookie basinya
     * dibuang di sini karena Server Component tidak boleh menghapus cookie,
     * sedangkan middleware boleh.
     *
     * Tanpa cabang ini pengguna terperangkap: middleware melihat cookie lalu
     * memantulkannya ke /dashboard, dashboard mendapat 401 lalu mengarah ke
     * /login lagi, berputar tanpa henti.
     */
    if (request.nextUrl.searchParams.get('sesi') === 'berakhir') {
      const jawaban = NextResponse.next();
      jawaban.cookies.delete(NAMA_COOKIE_TOKEN);

      return jawaban;
    }

    const tujuan = request.nextUrl.clone();
    tujuan.pathname = '/dashboard';
    tujuan.search = '';

    return NextResponse.redirect(tujuan);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Seluruh rute kecuali aset Next.js, berkas statis, dan Route Handler
     * autentikasi (yang justru dipakai untuk masuk dan keluar).
     *
     * Berkas statis dikenali dari akhirannya, bukan didaftar satu per satu.
     * Menyebut `favicon.ico` saja tidak cukup: apa pun yang diletakkan di
     * `public/` ikut terjaring middleware dan dialihkan ke halaman masuk.
     * Untuk gambar akibatnya tidak kentara — pengoptimal Next.js menerima
     * halaman HTML alih-alih berkas gambar, lalu menolak dengan 400 dan pesan
     * "isn't a valid image ... received null" yang tidak menyebut pengalihan
     * sama sekali.
     */
    '/((?!_next/static|_next/image|api/auth|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$).*)',
  ],
};
