'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, BellRing, CheckCheck, Inbox, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { echoDams } from '@/lib/echo';
import { formatTanggalWaktu } from '@/lib/format';
import type { JenisNotifikasi, KotakNotifikasi, Notifikasi } from '@/lib/notifikasi';

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
 * Notifikasi didorong Reverb lewat WebSocket, jadi lonceng berubah seketika
 * tanpa menunggu penyegaran. Penyegaran berkala tetap ada sebagai jaring
 * pengaman — sambungan WebSocket dapat putus tanpa pemberitahuan, dan lonceng
 * yang diam-diam berhenti diperbarui lebih buruk daripada beberapa permintaan
 * tambahan.
 *
 * Isinya diambil dari Route Handler `/api/notifikasi`, bukan langsung dari
 * backend — token berada di cookie httpOnly dan tidak pernah tersedia untuk
 * JavaScript client.
 */
export function LoncengNotifikasi({ penggunaId }: { penggunaId: number }) {
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

  /*
   * Notifikasi yang didorong Reverb disisipkan langsung, tanpa memanggil
   * server lagi — isinya sudah lengkap di muatan siarannya. Memanggil ulang
   * hanya akan mengembalikan hal yang sama, sedikit lebih lambat.
   */
  useEffect(() => {
    const echo = echoDams();
    if (echo === null) return;

    const channel = echo.private(`App.Models.User.${penggunaId}`);

    channel.notification((muatan: Record<string, unknown>) => {
      const masuk: Notifikasi = {
        id: String(muatan.id ?? ''),
        jenis: (muatan.jenis as Notifikasi['jenis']) ?? 'umum',
        judul: String(muatan.judul ?? ''),
        pesan: String(muatan.pesan ?? ''),
        tautan: (muatan.tautan as string | null) ?? null,
        dibaca: false,
        waktu: (muatan.waktu as string | null) ?? null,
      };

      setKotak((sebelumnya) => {
        // Siaran dapat tiba dua kali bila sambungan sempat tersambung ulang.
        if (sebelumnya.daftar.some((satu) => satu.id === masuk.id)) {
          return sebelumnya;
        }

        return {
          jumlah_belum_dibaca: sebelumnya.jumlah_belum_dibaca + 1,
          daftar: [masuk, ...sebelumnya.daftar].slice(0, 20),
        };
      });
    });

    return () => {
      echo.leave(`App.Models.User.${penggunaId}`);
    };
  }, [penggunaId]);

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

  /**
   * Menghapus satu notifikasi.
   *
   * Dibuang lebih dulu di layar. Notifikasi yang tetap tampil beberapa ratus
   * milidetik setelah tombol hapusnya ditekan membuat pengguna menekannya lagi
   * — dan permintaan kedua menemukan barisnya sudah tidak ada.
   */
  async function hapus(id: string) {
    setKotak((sebelumnya) => {
      const dibuang = sebelumnya.daftar.find((satu) => satu.id === id);

      return {
        jumlah_belum_dibaca:
          dibuang && !dibuang.dibaca
            ? Math.max(0, sebelumnya.jumlah_belum_dibaca - 1)
            : sebelumnya.jumlah_belum_dibaca,
        daftar: sebelumnya.daftar.filter((satu) => satu.id !== id),
      };
    });

    try {
      await fetch('/api/notifikasi/hapus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } finally {
      void muat();
    }
  }

  /**
   * Membersihkan notifikasi yang sudah dibaca.
   *
   * Hanya yang sudah dibaca, dan itu disengaja: membuang seluruhnya sekaligus
   * berarti menghapus pemberitahuan yang belum sempat dilihat, tanpa jalan
   * mengembalikannya. Yang belum dibaca dihapus satu per satu bila memang
   * dikehendaki.
   */
  async function bersihkan() {
    setKotak((sebelumnya) => ({
      jumlah_belum_dibaca: sebelumnya.jumlah_belum_dibaca,
      daftar: sebelumnya.daftar.filter((satu) => !satu.dibaca),
    }));

    try {
      await fetch('/api/notifikasi/hapus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bersihkan: true }),
      });
    } finally {
      void muat();
    }
  }

  const belumDibaca = kotak.jumlah_belum_dibaca;
  const adaYangDibaca = kotak.daftar.some((satu) => satu.dibaca);

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

            <span className="flex items-center gap-1">
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

              {/*
                Hanya membuang yang sudah dibaca — lihat catatan pada
                `bersihkan()`. Tombolnya pun hanya muncul saat memang ada yang
                dapat dibuang.
              */}
              {adaYangDibaca && (
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    void bersihkan();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-control px-1.5 py-0.5 text-caption text-ink-soft outline-none data-[highlighted]:bg-surface-muted data-[highlighted]:text-danger-text"
                >
                  <Trash2 aria-hidden="true" className="size-3" />
                  Bersihkan
                </DropdownMenu.Item>
              )}
            </span>
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
                  /*
                    Tombol hapus berada **di luar** menu item, bukan di dalamnya.
                    Menu item Radix menangkap seluruh penekanan di dalamnya dan
                    menjalankan `onSelect`-nya sendiri, sehingga tombol hapus
                    yang bersarang akan ikut membuka tautan notifikasinya
                    sebelum sempat menghapus apa pun.
                  */
                  <div key={item.id} className="group/baris relative">
                  <DropdownMenu.Item
                    onSelect={(event) => {
                      event.preventDefault();
                      if (!item.dibaca) void tandaiDibaca(item.id);
                      if (item.tautan) router.push(item.tautan);
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 border-b border-line py-2.5 pl-3 pr-9 outline-none last:border-b-0',
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

                  {/*
                    Selalu ada di DOM, hanya disamarkan sampai barisnya disorot
                    atau tombolnya terfokus. `hidden` sampai hover membuatnya
                    tidak pernah terjangkau papan ketik maupun layar sentuh.
                  */}
                  <button
                    type="button"
                    onClick={(peristiwa) => {
                      peristiwa.stopPropagation();
                      void hapus(item.id);
                    }}
                    aria-label={`Hapus notifikasi ${item.judul}`}
                    className="absolute right-2 top-2.5 grid size-6 place-items-center rounded-control text-ink-soft opacity-0 transition-opacity duration-fast hover:bg-surface-sunken hover:text-danger-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-hover/baris:opacity-100"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                  </div>
                );
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
