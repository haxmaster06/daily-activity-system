import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptPasang } from './prompt-pasang';

/**
 * Menirukan `beforeinstallprompt` — tidak ada di jsdom. Yang diuji adalah
 * penahanan acaranya dan pemanggilan `prompt()`, bukan protokol pemasangan.
 */
function picuPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
  window.dispatchEvent(event);

  return prompt;
}

beforeEach(() => {
  // jsdom tidak punya matchMedia; komponen memakainya untuk mendeteksi mode
  // standalone. Dianggap belum terpasang.
  window.matchMedia ??= vi.fn().mockReturnValue({ matches: false }) as never;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PromptPasang', () => {
  it('diam sampai peramban menawarkan pemasangan', () => {
    render(<PromptPasang />);

    expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument();
  });

  it('menampilkan tombol lalu membuka dialog pemasangan bawaan saat ditekan', async () => {
    render(<PromptPasang />);

    const prompt = picuPrompt();

    const tombol = await screen.findByRole('button', { name: /Pasang Aplikasi/i });
    await userEvent.click(tombol);

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument(),
    );
  });

  it('tidak menawari lagi setelah tawarannya ditutup', async () => {
    const { unmount } = render(<PromptPasang />);
    picuPrompt();

    await userEvent.click(await screen.findByRole('button', { name: /Tutup tawaran pasang/i }));
    expect(localStorage.getItem('dams-pasang-ditolak')).toBe('1');

    // Kunjungan berikutnya: acara dipicu lagi, tetapi tombol tak muncul.
    unmount();
    render(<PromptPasang />);
    picuPrompt();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Pasang Aplikasi/i })).not.toBeInTheDocument();
    });
  });
});
