import { describe, expect, it, vi } from 'vitest';

import { opsiCookieToken } from './auth-cookie';

describe('cookie token', () => {
  it('selalu httpOnly agar tidak terbaca JavaScript browser', () => {
    expect(opsiCookieToken().httpOnly).toBe(true);
  });

  it('memakai sameSite lax dan berlaku untuk seluruh path', () => {
    const opsi = opsiCookieToken();
    expect(opsi.sameSite).toBe('lax');
    expect(opsi.path).toBe('/');
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
