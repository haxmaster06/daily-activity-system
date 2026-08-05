'use client';

import type { ReactNode } from 'react';
import { Filter, FilterX } from 'lucide-react';

import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { usePenyaring } from './use-penyaring';

/**
 * Nama departemen yang dapat diklik untuk menyaring seluruh halaman.
 *
 * Dipakai di judul kartu, sel tabel, dan mana pun sebuah departemen disebut —
 * supaya perilakunya sama di seluruh Analytics. Menekan yang sedang tersaring
 * melepaskannya kembali; tanpa itu, pengguna yang tidak sengaja menyaring harus
 * mencari tombol Bersihkan untuk kembali.
 *
 * Selalu berupa `<button>` sungguhan, bukan sel yang kebetulan menangkap klik:
 * hanya tombol yang dapat dijangkau papan ketik dan dikenali pembaca layar.
 */
export function TautanDepartemen({
  id,
  nama,
  children,
  className,
}: {
  id: number;
  nama: string;
  children?: ReactNode;
  className?: string;
}) {
  const { saringDepartemen, hanyaDepartemen } = usePenyaring();

  const tersaring = hanyaDepartemen(id);
  const Ikon = tersaring ? FilterX : Filter;

  return (
    <Tooltip
      isi={tersaring ? `Lepaskan penyaring ${nama}` : `Saring hanya ${nama}`}
      jeda={400}
    >
      <button
        type="button"
        onClick={() => saringDepartemen(id)}
        /*
         * Namanya menyebutkan tindakannya, bukan hanya nama departemennya.
         * Tanpa ini, pembaca layar mengumumkan "Produksi, tombol" — dan tidak
         * ada cara mengetahui bahwa menekannya menyaring seluruh halaman.
         * Tooltip tidak menutup celah itu: isinya hanya terbaca setelah
         * tombolnya terfokus, dan tidak pernah pada layar sentuh.
         */
        aria-label={tersaring ? `Lepaskan penyaring ${nama}` : `Saring hanya ${nama}`}
        className={cn(
          'group inline-flex items-center gap-1 rounded-control text-left underline-offset-4',
          'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          tersaring ? 'font-medium text-primary-text' : 'text-primary-text',
          className,
        )}
      >
        {children ?? nama}
        <Ikon
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 transition-opacity duration-fast',
            tersaring ? 'opacity-80' : 'opacity-0 group-hover:opacity-60',
          )}
        />
      </button>
    </Tooltip>
  );
}
