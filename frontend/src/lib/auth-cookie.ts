import 'server-only';

/**
 * Token akses disimpan pada cookie httpOnly yang hanya ditulis dan dibaca di
 * sisi server Next.js. JavaScript di browser tidak pernah menyentuhnya,
 * sehingga skrip pihak ketiga atau celah XSS tidak dapat mencurinya.
 */

export const NAMA_COOKIE_TOKEN = 'dams_token';

export interface OpsiCookieToken {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge?: number;
}

export function opsiCookieToken(kedaluwarsaPada?: string): OpsiCookieToken {
  const opsi: OpsiCookieToken = {
    httpOnly: true,
    sameSite: 'lax',
    // Di pengembangan lokal aplikasi berjalan melalui http, sehingga flag
    // secure hanya dipasang pada produksi.
    secure: process.env.NODE_ENV === 'production',
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
