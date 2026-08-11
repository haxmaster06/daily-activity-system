import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PenjagaVersi } from './penjaga-versi';

/**
 * Menirukan penolakan promise yang lolos dari pemanggil aksi.
 *
 * `PromiseRejectionEvent` tidak ada di jsdom, jadi eventnya disusun sendiri —
 * yang diuji adalah pembacaan alasannya, bukan kelas eventnya.
 */
function tolak(alasan: unknown) {
  const event = new Event('unhandledrejection', { cancelable: true });
  Object.defineProperty(event, 'reason', { value: alasan });
  window.dispatchEvent(event);
}

describe('PenjagaVersi', () => {
  it('diam selama tidak ada penolakan', () => {
    render(<PenjagaVersi />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /*
   * Bunyi persis yang dilempar Next.js ketika tab dibuka sebelum deployment
   * berikutnya. Tanpa penjaga ini kegagalannya sunyi: tombolnya berhenti
   * berputar dan pengguna menyimpulkan datanya tidak dapat disimpan.
   */
  it('menawarkan muat ulang saat Server Action tidak dikenali', async () => {
    render(<PenjagaVersi />);

    tolak(
      new Error(
        'Server Action "4050c9377e45bd38efa1966301dba5022c0a8ee4d2" was not found on the server.',
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/baru saja diperbarui/i),
    );
    expect(screen.getByRole('button', { name: /Muat Ulang/i })).toBeInTheDocument();
  });

  it('mengabaikan penolakan lain', () => {
    render(<PenjagaVersi />);

    tolak(new Error('Gagal menyambung ke server.'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
