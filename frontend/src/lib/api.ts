import 'server-only';

import { cookies } from 'next/headers';

import { NAMA_COOKIE_TOKEN } from '@/lib/auth-cookie';

/**
 * Klien HTTP menuju backend Laravel.
 *
 * Hanya dipakai di sisi server (Server Component dan Route Handler). Browser
 * tidak pernah memanggil backend secara langsung, sehingga token tidak perlu
 * tersedia untuk JavaScript client.
 */

export const BASE_URL_BACKEND =
  process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:13002';

/** Bentuk envelope response API DAMS. */
export interface EnvelopeApi<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
  reference?: string;
  meta?: {
    halaman_saat_ini: number;
    per_halaman: number;
    total_data: number;
    total_halaman: number;
  };
}

export class GalatApi extends Error {
  constructor(
    /** Pesan siap tampil ke pengguna, sudah dalam Bahasa Indonesia. */
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
    readonly reference?: string,
  ) {
    super(message);
    this.name = 'GalatApi';
  }
}

interface OpsiPermintaan extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Menyertakan token dari cookie. Aktif secara bawaan. */
  autentikasi?: boolean;
}

export async function panggilApi<T>(
  path: string,
  { body, autentikasi = true, headers, ...init }: OpsiPermintaan = {},
): Promise<EnvelopeApi<T>> {
  const headerPermintaan = new Headers(headers);
  headerPermintaan.set('Accept', 'application/json');

  if (body !== undefined) {
    headerPermintaan.set('Content-Type', 'application/json');
  }

  if (autentikasi) {
    const token = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;
    if (token) {
      headerPermintaan.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL_BACKEND}/api${path}`, {
      ...init,
      headers: headerPermintaan,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    // Backend tidak dapat dihubungi. Pengguna tidak perlu tahu detail jaringan.
    throw new GalatApi('Tidak dapat terhubung ke server. Coba lagi sebentar lagi.', 503);
  }

  const teks = await response.text();
  let payload: EnvelopeApi<T> | null = null;

  try {
    payload = teks ? (JSON.parse(teks) as EnvelopeApi<T>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new GalatApi(
      payload?.message ?? 'Terjadi gangguan saat memproses permintaan.',
      response.status,
      payload?.errors,
      payload?.reference,
    );
  }

  if (payload === null) {
    throw new GalatApi('Terjadi gangguan saat memproses permintaan.', response.status);
  }

  return payload;
}
