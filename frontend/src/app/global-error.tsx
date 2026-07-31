'use client';

import { useEffect } from 'react';

import './globals.css';

/**
 * Batas galat terakhir.
 *
 * Menggantikan seluruh dokumen, termasuk layout utama, sehingga harus
 * menyediakan `html` dan `body` sendiri dan mengimpor gayanya sendiri.
 * Dipakai hanya bila layout utama pun gagal dirender.
 */
export default function GalatMenyeluruh({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-background text-body text-ink antialiased">
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
          <h1 className="text-page-title text-ink">Aplikasi gagal dimuat</h1>
          <p className="mt-1.5 text-body-lg text-ink-muted">
            Terjadi gangguan yang membuat halaman tidak dapat ditampilkan. Coba muat
            ulang; bila masih sama, sampaikan kode di bawah kepada pengelola sistem.
          </p>

          {error.digest && (
            <p className="mt-3 text-caption text-ink-soft">
              Kode rujukan: <span className="font-mono text-ink-muted">{error.digest}</span>
            </p>
          )}

          <button type="button" onClick={reset} className="btn-primary btn-sm mt-5">
            Coba Lagi
          </button>
        </main>
      </body>
    </html>
  );
}
