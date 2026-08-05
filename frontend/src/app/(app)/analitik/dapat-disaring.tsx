'use client';

import type { ReactNode } from 'react';
import { Filter, FilterX } from 'lucide-react';

import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { formatTanggalRingkas } from '@/lib/format';
import { usePenyaring, type KunciDaftar } from './use-penyaring';

/**
 * Apa pun yang dapat diklik untuk menyaring seluruh halaman.
 *
 * Dipakai di judul kartu, sel tabel, badge status, batang grafik — mana pun
 * sebuah nilai disebut, supaya perilakunya sama di seluruh Analytics. Menekan
 * yang sedang tersaring melepaskannya kembali; tanpa itu, pengguna yang tidak
 * sengaja menyaring harus mencari tombol Bersihkan untuk kembali, dan pada
 * halaman yang tinggal satu kartu tombol itu tidak terlihat sama sekali.
 *
 * Selalu berupa `<button>` sungguhan, bukan sel yang kebetulan menangkap klik:
 * hanya tombol yang dapat dijangkau papan ketik dan dikenali pembaca layar.
 */
function Tautan({
  aktif,
  nama,
  onTekan,
  children,
  className,
}: {
  aktif: boolean;
  /** Dipakai menyusun kalimat yang dibacakan pembaca layar. */
  nama: string;
  onTekan: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const kalimat = aktif ? `Lepaskan penyaring ${nama}` : `Saring hanya ${nama}`;
  const Ikon = aktif ? FilterX : Filter;

  return (
    <Tooltip isi={kalimat} jeda={400}>
      <button
        type="button"
        onClick={onTekan}
        /*
         * Namanya menyebutkan tindakannya, bukan hanya nilainya. Tanpa ini,
         * pembaca layar mengumumkan "Produksi, tombol" — dan tidak ada cara
         * mengetahui bahwa menekannya menyaring seluruh halaman. Tooltip tidak
         * menutup celah itu: isinya hanya terbaca setelah tombolnya terfokus,
         * dan tidak pernah pada layar sentuh.
         */
        aria-label={kalimat}
        className={cn(
          'group inline-flex items-center gap-1 rounded-control text-left underline-offset-4',
          'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          aktif ? 'font-medium text-primary-text' : 'text-primary-text',
          className,
        )}
      >
        {children ?? nama}
        <Ikon
          aria-hidden="true"
          className={cn(
            'size-3 shrink-0 transition-opacity duration-fast',
            aktif ? 'opacity-80' : 'opacity-0 group-hover:opacity-60',
          )}
        />
      </button>
    </Tooltip>
  );
}

/** Tautan penyaring untuk penyaring berdaftar mana pun. */
function TautanDaftar({
  kunci,
  nilai,
  nama,
  children,
  className,
}: {
  kunci: KunciDaftar;
  nilai: string | number;
  nama: string;
  children?: ReactNode;
  className?: string;
}) {
  const { saring, hanya } = usePenyaring();

  return (
    <Tautan
      aktif={hanya(kunci, nilai)}
      nama={nama}
      onTekan={() => saring(kunci, nilai)}
      className={className}
    >
      {children ?? nama}
    </Tautan>
  );
}

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
  return (
    <TautanDaftar kunci="departemen" nilai={id} nama={nama} className={className}>
      {children}
    </TautanDaftar>
  );
}

export function TautanPengguna({
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
  return (
    <TautanDaftar kunci="pengguna" nilai={id} nama={nama} className={className}>
      {children}
    </TautanDaftar>
  );
}

export function TautanTemplate({
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
  return (
    <TautanDaftar kunci="template" nilai={id} nama={nama} className={className}>
      {children}
    </TautanDaftar>
  );
}

export function TautanStatus({
  status,
  label,
  children,
  className,
}: {
  status: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <TautanDaftar kunci="status" nilai={status} nama={label} className={className}>
      {children}
    </TautanDaftar>
  );
}

/**
 * Isi satu kolom laporan yang dapat diklik untuk menyaring seluruh halaman.
 *
 * Inilah tautan yang paling sering ditekan pada halaman Keadaan Departemen:
 * nama pembeli, nama supplier, tahapan proses. `saring` dipisahkan dari `teks`
 * karena kolom master menyimpan salinan `{kode, nama}` — yang dibaca namanya,
 * yang menyaring kodenya.
 */
export function TautanNilai({
  kunci,
  saring,
  teks,
  children,
  className,
}: {
  kunci: string;
  saring: string;
  teks: string;
  children?: ReactNode;
  className?: string;
}) {
  const { nilai, saringNilai } = usePenyaring();

  return (
    <Tautan
      aktif={nilai.includes(`${kunci}:${saring}`)}
      nama={teks}
      onTekan={() => saringNilai(kunci, saring)}
      className={className}
    >
      {children ?? teks}
    </Tautan>
  );
}

/**
 * Satu tanggal yang dapat diklik untuk mempersempit rentang ke hari itu.
 *
 * Dipakai pada titik grafik harian dan sel peta panas: pertanyaan yang muncul
 * setelah melihat satu hari yang mencolok hampir selalu "hari itu sebenarnya
 * terjadi apa".
 */
export function TautanTanggal({
  tanggal,
  children,
  className,
}: {
  tanggal: string;
  children?: ReactNode;
  className?: string;
}) {
  const { dari, sampai, saringTanggal } = usePenyaring();

  return (
    <Tautan
      aktif={dari === tanggal && sampai === tanggal}
      nama={formatTanggalRingkas(tanggal)}
      onTekan={() => saringTanggal(tanggal)}
      className={className}
    >
      {children ?? formatTanggalRingkas(tanggal)}
    </Tautan>
  );
}
