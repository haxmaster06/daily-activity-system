'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { useSiaranData } from '@/lib/use-siaran-data';

/**
 * Membuat halaman Analytics mengikuti perubahan data tanpa dimuat ulang.
 *
 * Tidak menggambar apa pun sepanjang waktu — hanya satu keping sekilas saat
 * angkanya baru saja disegarkan. Penyegaran diam-diam membuat pembacanya
 * mengira ia salah membaca angka sebelumnya; keping ini menjawabnya dalam satu
 * kalimat, lalu menghilang.
 */
export function PemantauSiaran({ departemenId }: { departemenId: number[] }) {
  const [terlihat, setTerlihat] = useState(false);

  useSiaranData(departemenId, () => setTerlihat(true));

  useEffect(() => {
    if (!terlihat) return;

    const pewaktu = setTimeout(() => setTerlihat(false), 4_000);

    return () => clearTimeout(pewaktu);
  }, [terlihat]);

  if (!terlihat) return null;

  return (
    <p
      /*
       * `status`, bukan `alert`: pembaruan angka bukan hal mendesak, dan
       * `alert` memotong apa pun yang sedang dibacakan pembaca layar.
       */
      role="status"
      className="inline-flex items-center gap-1.5 rounded-control bg-secondary-subtle px-2 py-0.5 text-caption text-secondary-text"
    >
      <RefreshCw aria-hidden="true" className="size-3" />
      Angkanya baru saja diperbarui.
    </p>
  );
}
