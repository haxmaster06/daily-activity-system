'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Minus, Plus, RotateCcw } from 'lucide-react';

/** Sisi hasil potongan, dalam piksel. Sama dengan `FotoProfil::SISI`. */
const SISI = 512;

const ZOOM_MIN = 1;
const ZOOM_MAKS = 4;

/** Langkah geser dengan papan ketik, dalam piksel jendela. */
const LANGKAH = 12;

const AWAL: Point = { x: 0, y: 0 };

/**
 * Mengatur bagian mana dari foto yang dipakai, sebelum tersimpan.
 *
 * ## Mengapa memakai `react-easy-crop`
 *
 * Versi pertama pemotong ini ditulis sendiri, dan salah: perhitungan "pas
 * jendela"-nya menyisakan ruang kosong di sisi gambar pada rasio tertentu.
 * Perkaranya bukan satu rumus yang keliru — pemotong gambar harus menyatukan
 * skala penutup, batas geser, titik jangkar perbesaran, cubit dua jari, dan
 * putaran roda tetikus, dan tiap pasangan di antaranya punya kasus tepi
 * sendiri.
 *
 * `docs/standar-library-ui.md` §9 menuntut Radix dan React Aria diperiksa lebih
 * dulu. Keduanya tidak punya pemotong gambar, dan tidak berencana punya —
 * sama seperti Chart.js untuk grafik dan `@dnd-kit` untuk tarik-lepas.
 *
 * ## Mengapa hasilnya dipotong di peramban
 *
 * Server tetap menggambar ulang gambarnya — itu yang menghapus metadata EXIF
 * dan muatan yang menumpang di dalam berkas, dan tidak boleh dilewati. Yang
 * dikerjakan di sini hanya **memilih bagiannya**. Mengirim koordinat potongan
 * ke server juga bisa, tetapi berarti server harus memercayai angka dari
 * peramban dan memeriksa tiap satunya; mengirim gambar yang sudah terpotong
 * tidak menambah satu pun jalur baru yang perlu dijaga.
 *
 * Manfaat sampingannya nyata: foto 4 MB dari kamera ponsel berangkat sebagai
 * berkas 60 KB.
 *
 * ## Dapat dijalankan tanpa tetikus
 *
 * `react-easy-crop` sendiri hanya menerima seret dan cubit. Bagian gambar yang
 * dipakai adalah keputusan yang tidak dapat diwakilkan, sehingga geserannya
 * dibuat dapat dijalankan dengan tombol panah lewat state yang dikendalikan di
 * sini, dan perbesarannya memakai `input[type=range]` bawaan.
 */
export function PemotongFoto({
  berkas,
  onSiap,
}: {
  berkas: File;
  /** Dipanggil tiap kali potongannya berubah, dengan hasil siap unggah. */
  onSiap: (hasil: Blob | null) => void;
}) {
  const [alamat, setAlamat] = useState<string | null>(null);
  /** Foto lebih lebar daripada tinggi. Menentukan sisi mana yang memenuhi jendela. */
  const [mendatar, setMendatar] = useState(true);
  const [geser, setGeser] = useState<Point>(AWAL);
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  /*
   * Gambar sumber ditahan di ref, bukan state: nilainya hanya dipakai saat
   * memotong, dan menyimpannya sebagai state memicu render ulang yang tidak
   * mengubah apa pun di layar.
   */
  const sumberRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const objek = URL.createObjectURL(berkas);
    const gambar = new Image();

    gambar.onload = () => {
      sumberRef.current = gambar;
      setMendatar(gambar.width >= gambar.height);
      setAlamat(objek);
      setGeser(AWAL);
      setZoom(1);
    };
    gambar.src = objek;

    return () => URL.revokeObjectURL(objek);
  }, [berkas]);

  /**
   * Menggambar potongannya.
   *
   * `area` datang dari pustaka dalam piksel gambar **asli**, bukan piksel
   * layar, sehingga hasilnya tidak bergantung pada besar jendela pemotong.
   */
  const potong = useCallback(
    async (bagian: Area) => {
      const sumber = sumberRef.current;

      if (!sumber) return;

      const kanvas = document.createElement('canvas');
      kanvas.width = SISI;
      kanvas.height = SISI;

      const ctx = kanvas.getContext('2d');

      if (!ctx) {
        onSiap(null);

        return;
      }

      // Latar putih: gambar tembus pandang berakhir hitam pekat pada JPEG.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SISI, SISI);

      ctx.drawImage(
        sumber,
        bagian.x,
        bagian.y,
        bagian.width,
        bagian.height,
        0,
        0,
        SISI,
        SISI,
      );

      const hasil = await new Promise<Blob | null>((selesai) =>
        kanvas.toBlob(selesai, 'image/jpeg', 0.9),
      );

      onSiap(hasil);
    },
    [onSiap],
  );

  useEffect(() => {
    if (area) void potong(area);
  }, [area, potong]);

  return (
    <div className="flex w-full max-w-[280px] flex-col gap-2">
      <div
        role="application"
        tabIndex={0}
        aria-label="Geser foto untuk memilih bagian yang dipakai"
        onKeyDown={(peristiwa) => {
          const arah: Record<string, [number, number]> = {
            ArrowLeft: [-LANGKAH, 0],
            ArrowRight: [LANGKAH, 0],
            ArrowUp: [0, -LANGKAH],
            ArrowDown: [0, LANGKAH],
          };

          const langkah = arah[peristiwa.key];

          if (!langkah) return;

          peristiwa.preventDefault();

          /*
           * Batasnya tidak dihitung di sini. Pustaka menahan geseran ke dalam
           * batas gambarnya sendiri lewat `restrictPosition`, dan menghitungnya
           * dua kali berarti dua jawaban yang cepat atau lambat berbeda.
           */
          setGeser((lama) => ({ x: lama.x + langkah[0], y: lama.y + langkah[1] }));
        }}
        className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {alamat && (
          <Cropper
            image={alamat}
            crop={geser}
            zoom={zoom}
            aspect={1}
            /*
             * ⚠️ Bawaan pustakanya `contain`, dan itu penyebab ruang kosong di
             * sisi gambar: foto lebar muat seluruhnya di dalam jendela, lalu
             * menyisakan latar di kiri dan kanan — sehingga potongan persegi
             * yang dihasilkan ikut memuat latar itu.
             *
             * Sisi yang harus memenuhi jendela ditentukan di sini, bukan
             * diserahkan ke `cover`: pada foto potret, `cover` masih menyisakan
             * celah tipis di sisi kanan. Foto mendatar memenuhi jendela secara
             * tegak, foto tegak memenuhi jendela secara mendatar — sisanya
             * meluber keluar, dan justru itulah yang digeser pengguna.
             */
            objectFit={mendatar ? 'vertical-cover' : 'horizontal-cover'}
            /*
             * Bentuk lingkaran hanya penuntun. Hasilnya tetap persegi — avatar
             * dan kartu identitas yang membulatkannya — sehingga bagian di luar
             * lingkaran ikut tersimpan, hanya tidak terlihat di sebagian besar
             * tempat.
             */
            cropShape="round"
            showGrid={false}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAKS}
            onCropChange={setGeser}
            onZoomChange={setZoom}
            onCropComplete={(_bagianPersen, bagianPiksel) => setArea(bagianPiksel)}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Perkecil"
          onClick={() => setZoom((lama) => Math.max(ZOOM_MIN, lama - 0.2))}
          className="grid size-7 shrink-0 place-items-center rounded-control border border-line text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
        >
          <Minus aria-hidden="true" className="size-3.5" />
        </button>

        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAKS}
          step={0.05}
          value={zoom}
          onChange={(peristiwa) => setZoom(Number(peristiwa.target.value))}
          aria-label="Perbesaran foto"
          className="h-1 min-w-0 flex-1 accent-primary"
        />

        <button
          type="button"
          aria-label="Perbesar"
          onClick={() => setZoom((lama) => Math.min(ZOOM_MAKS, lama + 0.2))}
          className="grid size-7 shrink-0 place-items-center rounded-control border border-line text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>

        <button
          type="button"
          aria-label="Kembalikan ke awal"
          onClick={() => {
            setGeser(AWAL);
            setZoom(1);
          }}
          className="grid size-7 shrink-0 place-items-center rounded-control border border-line text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <p className="text-caption text-ink-soft">
        Seret fotonya untuk menggeser, atau pakai tombol panah setelah kotaknya terfokus.
      </p>
    </div>
  );
}
