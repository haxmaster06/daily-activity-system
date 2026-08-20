'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Memberitahu pengguna ketika halamannya lebih tua daripada servernya.
 *
 * Next.js menurunkan ID tiap Server Action dari isi kodenya, sehingga ID itu
 * berubah pada tiap build. Tab yang sudah terbuka sebelum deployment berikutnya
 * masih memegang ID lama, dan permintaannya dijawab 404 dengan
 * `UnrecognizedActionError`.
 *
 * Tanpa penanganan, kegagalannya sunyi: `Wizard.maju()` dan pemanggil aksi lain
 * hanya menunggu promise yang ditolak, tombolnya berhenti berputar, dan tidak
 * ada satu pun pesan. Pengguna menyimpulkan datanya tidak dapat disimpan —
 * padahal yang perlu dilakukan cuma memuat ulang.
 *
 * Dipasang sekali di layout aplikasi, bukan di tiap pemanggil aksi: yang
 * ditangkap adalah penolakan yang lolos dari seluruh pemanggil, dan menambahkan
 * try/catch di puluhan tempat hanya membuat sebagian di antaranya terlewat.
 *
 * Tidak memuat ulang sendiri. Isian yang belum tersimpan akan hilang, dan
 * memutuskan hal itu adalah hak pengguna, bukan hak kode ini.
 */
export function PenjagaVersi() {
  const [usang, setUsang] = useState(false);

  useEffect(() => {
    function periksa(alasan: unknown): boolean {
      const teks = String(
        (alasan as { message?: string })?.message ?? alasan ?? '',
      );

      return (
        teks.includes('Server Action') &&
        (teks.includes('was not found') || teks.includes('Failed to find'))
      );
    }

    function padaPenolakan(event: PromiseRejectionEvent) {
      if (!periksa(event.reason)) return;

      // Ditandai tertangani supaya tidak ikut menghiasi console sebagai galat
      // yang seolah-olah tidak diketahui siapa pun.
      event.preventDefault();
      setUsang(true);
    }

    window.addEventListener('unhandledrejection', padaPenolakan);

    return () => window.removeEventListener('unhandledrejection', padaPenolakan);
  }, []);

  if (!usang) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-accent/40 bg-accent-subtle px-4 py-2.5 max-md:bottom-16"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
        <p className="text-body text-ink">
          Aplikasi baru saja diperbarui, sehingga halaman ini sudah tidak sejalan
          dengan server. Muat ulang untuk melanjutkan.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary btn-sm shrink-0"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
