import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptPasang } from './prompt-pasang';

/**
 * Menirukan penangkapan `beforeinstallprompt` oleh skrip inline root layout:
 * acaranya sudah tersimpan di `window.__promptPasang`, lalu `promptpasang:siap`
 * memberi tahu komponen. Yang diuji penahanan + pemanggilan `prompt()`, bukan
 * protokol pemasangan.
 */
function siapkanChromium() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  window.__promptPasang = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  }) as never;
  window.dispatchEvent(new Event('promptpasang:siap'));

  return prompt;
}

const UA_ASLI = Object.getOwnPropertyDescriptor(navigator, 'userAgent');

function pakaiUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

beforeEach(() => {
  // jsdom tak punya matchMedia; komponen memakainya untuk mode standalone.
  window.matchMedia ??= vi.fn().mockReturnValue({ matches: false }) as never;
  window.__promptPasang = null;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (UA_ASLI) Object.defineProperty(navigator, 'userAgent', UA_ASLI);
});

describe('PromptPasang', () => {
  it('diam sampai ada tawaran pemasangan', () => {
    render(<PromptPasang />);

    expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument();
  });

  it('Android: menampilkan tombol lalu membuka dialog bawaan saat ditekan', async () => {
    render(<PromptPasang />);

    const prompt = siapkanChromium();

    await userEvent.click(await screen.findByRole('button', { name: /Pasang Aplikasi/i }));

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument(),
    );
  });

  it('tidak menawari lagi setelah tawarannya ditutup', async () => {
    const { unmount } = render(<PromptPasang />);
    siapkanChromium();

    await userEvent.click(await screen.findByRole('button', { name: /Tutup tawaran pasang/i }));
    expect(localStorage.getItem('dams-pasang-ditolak')).toBe('1');

    unmount();
    render(<PromptPasang />);
    siapkanChromium();

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument(),
    );
  });

  /*
   * iOS Safari tak pernah memancarkan beforeinstallprompt — di sanalah dulu
   * tombol tak muncul sama sekali. Kini tombolnya tampil dan membuka petunjuk
   * Bagikan → Ke Layar Utama, satu-satunya cara memasang di iPhone.
   */
  it('iOS: menampilkan tombol yang membuka petunjuk Ke Layar Utama', async () => {
    pakaiUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );

    render(<PromptPasang />);

    const tombol = await screen.findByRole('button', { name: /Pasang Aplikasi/i });
    expect(screen.queryByText(/Ke Layar Utama/i)).not.toBeInTheDocument();

    await userEvent.click(tombol);

    expect(await screen.findByText(/Ke Layar Utama/i)).toBeInTheDocument();
  });
});
