import 'server-only';

/**
 * Token akses disimpan pada cookie httpOnly yang hanya ditulis dan dibaca di
 * sisi server Next.js. JavaScript di browser tidak pernah menyentuhnya,
 * sehingga skrip pihak ketiga atau celah XSS tidak dapat mencurinya.
 */

export const NAMA_COOKIE_TOKEN = 'dams_token';

/**
 * Tujuan pengalihan ketika token ditolak backend.
 *
 * Halaman biasa, bukan Route Handler. Sesi dapat berakhir di tengah navigasi
 * antar halaman, dan pada navigasi seperti itu router Next mengambil tujuan
 * pengalihan sebagai muatan RSC — Route Handler tidak pernah menghasilkannya,
 * sehingga yang muncul di layar adalah galat mentah alih-alih halaman masuk.
 *
 * Penanda `sesi=berakhir` dibaca dua pihak: middleware membuang cookie yang
 * sudah basi, dan halaman masuk menjelaskan kepada pengguna mengapa ia ada di
 * sana.
 */
export const RUTE_SESI_BERAKHIR = '/login?sesi=berakhir';

export interface OpsiCookieToken {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge?: number;
}

/**
 * Menentukan flag `secure` pada cookie token.
 *
 * Peramban menolak menyimpan cookie ber-flag `Secure` yang datang lewat http
 * polos — dan menolaknya tanpa suara. Yang terlihat pengguna adalah login yang
 * membalas berhasil, lalu tiap halaman melempar balik ke halaman masuk.
 *
 * `NODE_ENV` tidak cukup untuk memutuskannya. Build produksi selalu bernilai
 * `production`, sedangkan skema yang melayaninya bisa http — fase QA berjalan
 * di atas IP publik tanpa TLS. Yang menentukan adalah skema, bukan jenis build,
 * sehingga nilainya diambil dari environment.
 *
 * Tanpa awalan `NEXT_PUBLIC_`, jadi dibaca saat container berjalan: naik ke
 * https cukup mengubah nilainya lalu restart, tanpa membangun ulang bundel.
 *
 * Bila variabelnya tidak diisi, perilaku lama tetap berlaku — pengembangan
 * lokal dan deployment yang sudah ada tidak berubah.
 */
function cookieHarusSecure(): boolean {
  const disetel = process.env.DAMS_COOKIE_SECURE;

  if (disetel === undefined || disetel === '') {
    return process.env.NODE_ENV === 'production';
  }

  return disetel === 'true';
}

export function opsiCookieToken(kedaluwarsaPada?: string): OpsiCookieToken {
  const opsi: OpsiCookieToken = {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieHarusSecure(),
    path: '/',
  };

  if (kedaluwarsaPada) {
    const detik = Math.floor((new Date(kedaluwarsaPada).getTime() - Date.now()) / 1000);
    if (Number.isFinite(detik) && detik > 0) {
      opsi.maxAge = detik;
    }
  }

  return opsi;
}
