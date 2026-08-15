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
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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
  it('diam di peramban non-ponsel tanpa tawaran pemasangan', () => {
    render(<PromptPasang />);

    expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument();
  });

  it('Android: sekali tekan membuka dialog pemasangan bawaan saat acaranya siap', async () => {
    pakaiUserAgent(UA_ANDROID);
    render(<PromptPasang />);

    const prompt = siapkanChromium();

    await userEvent.click(await screen.findByRole('button', { name: /Pasang Aplikasi/i }));

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument(),
    );
  });

  /*
   * Inti perbaikannya: Chrome menahan beforeinstallprompt sampai ada
   * interaksi, jadi di layar masuk acaranya belum ada. Tombol tetap harus
   * tampil sejak awal, dengan cara pasang lewat menu sebagai gantinya.
   */
  it('Android tanpa acara: tombol tetap tampil dan menunjukkan cara pasang lewat menu', async () => {
    pakaiUserAgent(UA_ANDROID);
    render(<PromptPasang />);

    const tombol = await screen.findByRole('button', { name: /Pasang Aplikasi/i });
    expect(screen.queryByText(/Instal aplikasi/i)).not.toBeInTheDocument();

    await userEvent.click(tombol);

    expect(await screen.findByText(/Instal aplikasi/i)).toBeInTheDocument();
  });

  /*
   * iOS Safari tak pernah memancarkan beforeinstallprompt — di sanalah dulu
   * tombol tak muncul sama sekali. Kini tampil dan membuka petunjuk Bagikan →
   * Ke Layar Utama, satu-satunya cara memasang di iPhone.
   */
  it('iOS: tombol tampil dan membuka petunjuk Ke Layar Utama', async () => {
    pakaiUserAgent(UA_IOS);
    render(<PromptPasang />);

    const tombol = await screen.findByRole('button', { name: /Pasang Aplikasi/i });
    expect(screen.queryByText(/Ke Layar Utama/i)).not.toBeInTheDocument();

    await userEvent.click(tombol);

    expect(await screen.findByText(/Ke Layar Utama/i)).toBeInTheDocument();
  });

  it('tidak menawari lagi setelah tawarannya ditutup', async () => {
    pakaiUserAgent(UA_ANDROID);
    const { unmount } = render(<PromptPasang />);

    await userEvent.click(await screen.findByRole('button', { name: /Tutup tawaran pasang/i }));
    expect(localStorage.getItem('dams-pasang-ditolak')).toBe('1');

    unmount();
    render(<PromptPasang />);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument(),
    );
  });
});
