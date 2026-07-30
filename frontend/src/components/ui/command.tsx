'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Command as Cmdk } from 'cmdk';
import { Search } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/cn';

export interface PerintahCepat {
  /** Kelompok pada daftar, mis. "Halaman" atau "Tindakan". */
  kelompok: string;
  label: string;
  /** Kata lain yang ikut dicocokkan saat pencarian. */
  kataKunci?: string;
  ikon?: ReactNode;
  /** Salah satu diisi: pindah halaman, atau jalankan tindakan. */
  href?: string;
  jalankan?: () => void;
}

/**
 * Pencarian perintah cepat (cmdk).
 *
 * Radix tidak menyediakan komponen Command; `cmdk` adalah pustaka yang juga
 * dipakai shadcn untuk ini. Dialognya sendiri memakai `Modal` berbasis React
 * Aria, sehingga perilaku fokus dan penutupannya sama dengan dialog lain.
 *
 * Dibuka dengan Ctrl+K. Jalan pintas ini pelengkap, bukan satu-satunya jalan
 * menuju sebuah fitur — semuanya tetap dapat dicapai lewat navigasi biasa
 * (standarisasi §20).
 */
export function CommandPalette({ perintah }: { perintah: PerintahCepat[] }) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);

  useEffect(() => {
    function tekan(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setTerbuka((sebelumnya) => !sebelumnya);
      }
    }

    document.addEventListener('keydown', tekan);
    return () => document.removeEventListener('keydown', tekan);
  }, []);

  function pilih(item: PerintahCepat) {
    setTerbuka(false);

    if (item.href) router.push(item.href);
    else item.jalankan?.();
  }

  const kelompok = [...new Set(perintah.map((p) => p.kelompok))];

  return (
    <Modal
      terbuka={terbuka}
      onTutup={() => setTerbuka(false)}
      judul="Cari Perintah"
      keterangan="Ketik untuk mencari halaman atau tindakan."
    >
      <Cmdk label="Cari perintah" className="flex flex-col gap-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          />
          <Cmdk.Input
            placeholder="Cari halaman atau tindakan..."
            className="field pl-8"
            autoFocus
          />
        </div>

        <Cmdk.List className="max-h-72 overflow-y-auto">
          <Cmdk.Empty className="px-2 py-6 text-center text-body-lg text-ink-soft">
            Tidak ada yang cocok.
          </Cmdk.Empty>

          {kelompok.map((nama) => (
            <Cmdk.Group
              key={nama}
              heading={nama}
              className={cn(
                '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2',
                '[&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-semibold',
                '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide',
                '[&_[cmdk-group-heading]]:text-ink-soft',
              )}
            >
              {perintah
                .filter((p) => p.kelompok === nama)
                .map((item) => (
                  <Cmdk.Item
                    key={item.label}
                    value={`${item.label} ${item.kataKunci ?? ''}`}
                    onSelect={() => pilih(item)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5',
                      'text-body-lg text-ink-muted',
                      'data-[selected=true]:bg-surface-muted data-[selected=true]:text-ink',
                    )}
                  >
                    {item.ikon}
                    {item.label}
                  </Cmdk.Item>
                ))}
            </Cmdk.Group>
          ))}
        </Cmdk.List>
      </Cmdk>
    </Modal>
  );
}
