'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Select } from '@/components/ui/select';

/**
 * Radix Select tidak menerima string kosong sebagai nilai item, sehingga
 * pilihan "Semua" memakai penanda tersendiri yang tidak pernah ditulis ke URL.
 */
const SEMUA = '__semua__';

export interface PilihanFilter {
  /** Nama parameter pada URL. */
  kunci: string;
  label: string;
  opsi: { nilai: string; label: string }[];
}

interface FilterBarProps {
  /** Placeholder kolom pencarian teks pada kolom identitas baris. */
  placeholderCari: string;
  pilihan?: PilihanFilter[];
}

/**
 * Bar penyaringan tabel (standar §24).
 *
 * Keadaan filter disimpan pada URL sehingga terlihat, dapat dibagikan, dan
 * dapat dikosongkan sekaligus. Penyaringan sesungguhnya dikerjakan server.
 */
export function FilterBar({ placeholderCari, pilihan = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cari, setCari] = useState(searchParams.get('cari') ?? '');

  // Menyamakan kembali isi kotak pencarian bila URL berubah dari luar
  // (tombol kembali peramban, atau tombol "Bersihkan filter").
  useEffect(() => {
    setCari(searchParams.get('cari') ?? '');
  }, [searchParams]);

  function terapkan(ubah: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    ubah(params);
    // Setiap perubahan filter mengembalikan tampilan ke halaman pertama.
    params.delete('halaman');

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const adaFilterAktif =
    Boolean(searchParams.get('cari')) ||
    pilihan.some((item) => Boolean(searchParams.get(item.kunci)));

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          terapkan((params) => {
            const nilai = cari.trim();
            if (nilai) params.set('cari', nilai);
            else params.delete('cari');
          });
        }}
        className="relative min-w-0 flex-1 sm:max-w-xs"
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="search"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
          placeholder={placeholderCari}
          aria-label={placeholderCari}
          className="field field-sm pl-8"
        />
      </form>

      {pilihan.map((item) => (
        <Select
          key={item.kunci}
          id={`filter-${item.kunci}`}
          ukuran="sm"
          className="w-auto min-w-40"
          placeholder={`${item.label}: Semua`}
          nilai={searchParams.get(item.kunci) ?? SEMUA}
          opsi={[{ nilai: SEMUA, label: `${item.label}: Semua` }, ...item.opsi]}
          onUbah={(nilai) =>
            terapkan((params) => {
              if (nilai && nilai !== SEMUA) params.set(item.kunci, nilai);
              else params.delete(item.kunci);
            })
          }
        />
      ))}

      {adaFilterAktif && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="btn-ghost btn-sm"
        >
          <X aria-hidden="true" className="size-3.5" />
          Bersihkan filter
        </button>
      )}
    </div>
  );
}
