import { afterEach, describe, expect, it, vi } from 'vitest';

import { opsiCookieToken } from './auth-cookie';

describe('cookie token', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('selalu httpOnly agar tidak terbaca JavaScript browser', () => {
    expect(opsiCookieToken().httpOnly).toBe(true);
  });

  it('memakai sameSite lax dan berlaku untuk seluruh path', () => {
    const opsi = opsiCookieToken();
    expect(opsi.sameSite).toBe('lax');
    expect(opsi.path).toBe('/');
  });

  /*
   * Flag `secure` menentukan apakah peramban mau menyimpan cookienya sama
   * sekali. Dipasang di atas http polos, cookie dibuang tanpa pesan galat dan
   * pengguna terlempar kembali ke halaman masuk setiap kali.
   */
  it('melepas flag secure ketika dilayani http polos', () => {
    vi.stubEnv('DAMS_COOKIE_SECURE', 'false');

    expect(opsiCookieToken().secure).toBe(false);
  });

  it('memasang flag secure ketika dilayani https', () => {
    vi.stubEnv('DAMS_COOKIE_SECURE', 'true');

    expect(opsiCookieToken().secure).toBe(true);
  });

  it('kembali mengikuti NODE_ENV bila variabelnya tidak disetel', () => {
    vi.stubEnv('DAMS_COOKIE_SECURE', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(opsiCookieToken().secure).toBe(true);
  });

  it('menyetel masa berlaku sesuai kedaluwarsa token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T08:00:00Z'));

    const opsi = opsiCookieToken('2026-07-30T16:00:00Z');
    expect(opsi.maxAge).toBe(8 * 60 * 60);

    vi.useRealTimers();
  });

  it('mengabaikan kedaluwarsa yang sudah lewat', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T08:00:00Z'));

    expect(opsiCookieToken('2026-07-30T07:00:00Z').maxAge).toBeUndefined();

    vi.useRealTimers();
  });

  it('mengabaikan nilai kedaluwarsa yang tidak valid', () => {
    expect(opsiCookieToken('bukan tanggal').maxAge).toBeUndefined();
  });
});
