'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, BellRing, CheckCheck, Inbox } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatTanggalWaktu } from '@/lib/format';
import type { JenisNotifikasi, KotakNotifikasi } from '@/lib/notifikasi';

/**
 * Jeda penyegaran lonceng.
 *
 * Tiga menit, bukan satu. Notifikasi DAMS bukan percakapan — laporan masuk dan
 * pengingat tidak menuntut ditampilkan dalam hitungan detik, sedangkan tiap
 * penyegaran membebani server untuk seluruh tab yang terbuka sepanjang hari.
 */
const JEDA_MUAT_ULANG = 180_000;

const IKON: Record<JenisNotifikasi, typeof Bell> = {
  laporan_dikirim: Inbox,
  laporan_ditinjau: CheckCheck,
  pengingat_laporan: BellRing,
  umum: Bell,
};

/**
 * Lonceng notifikasi pada bilah navigasi.
 *
 * Isinya diambil berkala dari Route Handler `/api/notifikasi`, bukan langsung
 * dari backend — token berada di cookie httpOnly dan tidak pernah tersedia
 * untuk JavaScript client.
 */
export function LoncengNotifikasi() {
  const router = useRouter();
  const [kotak, setKotak] = useState<KotakNotifikasi>({
    jumlah_belum_dibaca: 0,
    daftar: [],
  });

  const muat = useCallback(async () => {
    try {
      const response = await fetch('/api/notifikasi', { cache: 'no-store' });
      if (!response.ok) return;

      setKotak((await response.json()) as KotakNotifikasi);
    } catch {
      // Lonceng yang gagal dimuat dibiarkan menampilkan isi sebelumnya.
    }
  }, []);

  useEffect(() => {
    void muat();

    /*
     * Tab yang tidak terlihat berhenti menyegarkan. Tanpa ini, tab yang
     * ditinggalkan terbuka seharian tetap memanggil server tiap beberapa menit
     * untuk isi yang tidak dilihat siapa pun — dan orang cenderung
     * meninggalkan banyak tab terbuka.
     */
    const pewaktu = setInterval(() => {
      if (!document.hidden) void muat();
    }, JEDA_MUAT_ULANG);

    // Kembali ke tab berarti isinya perlu segar sekarang, bukan menunggu
    // giliran berikutnya.
    const saatTerlihat = () => {
      if (!document.hidden) void muat();
    };

    document.addEventListener('visibilitychange', saatTerlihat);

    return () => {
      clearInterval(pewaktu);
      document.removeEventListener('visibilitychange', saatTerlihat);
    };
  }, [muat]);

  async function tandaiDibaca(id?: string) {
    // Ditandai lebih dulu di layar supaya lencana tidak tertinggal di belakang
    // permintaan jaringan.
    setKotak((sebelumnya) => ({
      jumlah_belum_dibaca: id
        ? Math.max(0, sebelumnya.jumlah_belum_dibaca - 1)
        : 0,
      daftar: sebelumnya.daftar.map((item) =>
        !id || item.id === id ? { ...item, dibaca: true } : item,
      ),
    }));

    try {
      await fetch('/api/notifikasi/baca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      });
    } finally {
      void muat();
    }
  }

  const belumDibaca = kotak.jumlah_belum_dibaca;

  return (
    <DropdownMenu.Root onOpenChange={(terbuka) => terbuka && void muat()}>
      <DropdownMenu.Trigger
        aria-label={
          belumDibaca > 0
            ? `Notifikasi, ${belumDibaca} belum dibaca`
            : 'Notifikasi, tidak ada yang baru'
        }
        className="relative grid size-8 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
      >
        <Bell aria-hidden="true" className="size-4" />

        {/*
          Lencana memuat angkanya, bukan sekadar titik berwarna — status tidak
          boleh dibedakan lewat warna saja (standar §20.3).
        */}
        {belumDibaca > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold leading-4 text-white">
            {belumDibaca > 9 ? '9+' : belumDibaca}
          </span>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-40 w-[min(22rem,calc(100vw-2rem))] animate-masuk-halus rounded-card border border-line bg-surface shadow-modal"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <p className="text-label font-semibold text-ink">Notifikasi</p>

            {belumDibaca > 0 && (
              <DropdownMenu.Item
                onSelect={(event) => {
                  event.preventDefault();
                  void tandaiDibaca();
                }}
                className="cursor-pointer rounded-control px-1.5 py-0.5 text-caption text-primary-text outline-none data-[highlighted]:bg-primary-subtle"
              >
                Tandai semua dibaca
              </DropdownMenu.Item>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {kotak.daftar.length === 0 ? (
              <p className="px-3 py-8 text-center text-body text-ink-soft">
                Belum ada notifikasi.
              </p>
            ) : (
              kotak.daftar.map((item) => {
                const Ikon = IKON[item.jenis] ?? Bell;

                return (
                  <DropdownMenu.Item
                    key={item.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      if (!item.dibaca) void tandaiDibaca(item.id);
                      if (item.tautan) router.push(item.tautan);
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 border-b border-line px-3 py-2.5 outline-none last:border-b-0',
                      'data-[highlighted]:bg-surface-muted',
                      !item.dibaca && 'bg-primary-subtle/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                        item.dibaca
                          ? 'bg-surface-muted text-ink-soft'
                          : 'bg-primary-subtle text-primary-text',
                      )}
                    >
                      <Ikon aria-hidden="true" className="size-3.5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-body-lg text-ink',
                          !item.dibaca && 'font-semibold',
                        )}
                      >
                        {item.judul}
                      </span>
                      <span className="block text-body text-ink-muted">{item.pesan}</span>
                      <span className="mt-0.5 block text-meta text-ink-soft">
                        {formatTanggalWaktu(item.waktu)}
                      </span>
                    </span>

                    {!item.dibaca && (
                      <span className="sr-only">Belum dibaca</span>
                    )}
                  </DropdownMenu.Item>
                );
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
