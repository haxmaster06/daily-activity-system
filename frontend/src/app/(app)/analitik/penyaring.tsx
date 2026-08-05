'use client';

import { useState } from 'react';
import { Building2, CalendarRange, Check, CircleDot, FileText, Search, User, X } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import { Popover } from '@/components/ui/popover';
import type { OpsiAnalitik } from '@/lib/analitik';
import { cn } from '@/lib/cn';
import { formatTanggalRingkas } from '@/lib/format';
import { usePenyaring, type KunciDaftar } from './use-penyaring';

/** Pintasan rentang yang paling sering dipakai. */
const PINTASAN = [
  { label: '7 hari terakhir', hari: 7 },
  { label: '30 hari terakhir', hari: 30 },
  { label: '90 hari terakhir', hari: 90 },
] as const;

/** Di atas jumlah ini, daftar pilihan diberi kotak pencarian. */
const AMBANG_CARI = 8;

function isoHariIni(mundur = 0): string {
  const tanggal = new Date();
  tanggal.setDate(tanggal.getDate() - mundur);

  return tanggal.toISOString().slice(0, 10);
}

interface Pilihan {
  nilai: string;
  label: string;
  /** Baris kedua yang membedakan dua nama yang mirip. */
  keterangan?: string;
}

/**
 * Penyaring bersama seluruh halaman Analytics.
 *
 * Dirancang **satu baris**. Bentuk sebelumnya memakai tiga baris — dua pemilih
 * tanggal, tiga tombol pintasan, lalu satu pil per departemen — dan pada dua
 * puluh departemen deretan pilnya sendiri sudah menghabiskan setengah layar
 * sebelum satu angka pun terlihat.
 *
 * Yang tampil sepanjang waktu hanya **kesimpulannya**: rentang yang berlaku dan
 * berapa nilai yang dipilih pada tiap penyaring. Isiannya baru muncul saat
 * dibutuhkan. Tombol Bersihkan pun hanya ada saat ada yang perlu dibersihkan.
 *
 * Empat penyaring berdaftar — departemen, status, orang, template — memakai satu
 * komponen yang sama. Menuliskannya empat kali berarti empat kesempatan agar
 * salah satunya berperilaku berbeda.
 *
 * Nilainya disimpan di URL, bukan di state — supaya penyaringan dapat dibagikan
 * lewat tautan, bertahan saat halaman dimuat ulang, dan ikut terbawa saat
 * berpindah tab.
 */
export function PenyaringAnalitik({ opsi }: { opsi: OpsiAnalitik }) {
  const { dari, sampai, nilai, buangNilai, terapkan, bersihkan, adaPenyaring, jumlahPenyaring } =
    usePenyaring();

  /** Pintasan yang sedang berlaku, bila rentangnya persis salah satunya. */
  const pintasanAktif = PINTASAN.find(
    (satu) => dari === isoHariIni(satu.hari - 1) && sampai === isoHariIni(),
  );

  const satuHari = dari !== null && dari === sampai;

  const ringkasRentang =
    dari === null && sampai === null
      ? '30 hari terakhir'
      : satuHari
        ? formatTanggalRingkas(dari)
        : (pintasanAktif?.label ??
          `${formatTanggalRingkas(dari ?? '')} – ${formatTanggalRingkas(sampai ?? '')}`);

  return (
    <section aria-label="Penyaring analitik" className="flex flex-wrap items-center gap-2">
      <Popover
        label="Ubah rentang tanggal"
        ringkasan={ringkasRentang}
        Ikon={CalendarRange}
        aktif={dari !== null || sampai !== null}
        lebar="w-72"
      >
        <p className="field-label">Pintasan</p>
        <div className="mt-1 flex flex-col gap-1">
          {PINTASAN.map((satu) => (
            <button
              key={satu.hari}
              type="button"
              onClick={() =>
                terapkan((params) => {
                  params.set('dari', isoHariIni(satu.hari - 1));
                  params.set('sampai', isoHariIni());
                })
              }
              className={cn(
                'flex items-center justify-between rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
                pintasanAktif?.hari === satu.hari
                  ? 'bg-primary-subtle font-medium text-primary-text'
                  : 'text-ink-muted hover:bg-surface-muted',
              )}
            >
              {satu.label}
              {pintasanAktif?.hari === satu.hari && (
                <Check aria-hidden="true" className="size-3.5" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <p className="field-label">Rentang sendiri</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <DatePicker
              label="Dari"
              ukuran="sm"
              nilai={dari}
              onUbah={(nilai) =>
                terapkan((params) => {
                  if (nilai) params.set('dari', nilai);
                  else params.delete('dari');
                })
              }
            />
            <DatePicker
              label="Sampai"
              ukuran="sm"
              nilai={sampai}
              onUbah={(nilai) =>
                terapkan((params) => {
                  if (nilai) params.set('sampai', nilai);
                  else params.delete('sampai');
                })
              }
            />
          </div>

          <p className="mt-2 text-caption text-ink-soft">Paling panjang {opsi.batas_hari} hari.</p>
        </div>
      </Popover>

      {/*
        Tiap penyaring hanya muncul bila memang ada yang bisa dipilih. Pemantau
        satu departemen tidak perlu ditawari pilihan yang jawabannya sudah pasti,
        dan penyaring template tidak berguna pada instalasi bertemplate tunggal.
      */}
      <PilihBanyak
        kunci="departemen"
        label="Pilih departemen"
        semua="Semua departemen"
        satuan="departemen"
        Ikon={Building2}
        pilihan={opsi.departemen.map((satu) => ({
          nilai: String(satu.id),
          label: satu.nama,
        }))}
      />

      <PilihBanyak
        kunci="status"
        label="Pilih status"
        semua="Semua status"
        satuan="status"
        Ikon={CircleDot}
        pilihan={opsi.status.map((satu) => ({ nilai: satu.nilai, label: satu.label }))}
      />

      <PilihBanyak
        kunci="pengguna"
        label="Pilih orang"
        semua="Semua orang"
        satuan="orang"
        Ikon={User}
        pilihan={opsi.pengguna.map((satu) => ({
          nilai: String(satu.id),
          label: satu.nama,
          keterangan: satu.departemen,
        }))}
      />

      <PilihBanyak
        kunci="template"
        label="Pilih template laporan"
        semua="Semua template"
        satuan="template"
        Ikon={FileText}
        pilihan={opsi.template.map((satu) => ({
          nilai: String(satu.id),
          label: satu.nama,
        }))}
      />

      {/*
        Penyaring isi kolom tampil sebagai keping tersendiri, bukan disembunyikan
        di dalam popover. Nilainya datang dari klik pada isi halaman — sebuah
        nama pembeli, sebuah tahapan — dan bila tidak terlihat di sini, satu-
        satunya cara melepasnya adalah menemukan kembali tempat menekannya.
      */}
      {nilai.map((satu) => {
        // Hanya titik dua pertama yang memisahkan; sisanya bagian dari nilainya.
        const isi = satu.slice(satu.indexOf(':') + 1);

        return (
          <button
            key={satu}
            type="button"
            onClick={() => buangNilai(satu)}
            aria-label={`Lepaskan penyaring ${isi}`}
            className="inline-flex h-input-sm max-w-[16rem] items-center gap-1 rounded-control border border-primary bg-primary-subtle px-2 text-body font-medium text-primary-text transition-colors duration-fast hover:bg-primary-subtle/70"
          >
            <span className="min-w-0 break-words text-left">{isi}</span>
            <X aria-hidden="true" className="size-3.5 shrink-0" />
          </button>
        );
      })}

      {adaPenyaring && (
        <button
          type="button"
          onClick={bersihkan}
          className="inline-flex h-input-sm items-center gap-1 rounded-control px-2 text-body text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-danger-text"
        >
          <X aria-hidden="true" className="size-3.5" />
          Bersihkan
          <span className="sr-only">
            {' '}
            {jumlahPenyaring} penyaring yang sedang berlaku
          </span>
        </button>
      )}
    </section>
  );
}

/**
 * Satu penyaring berdaftar.
 *
 * Daftar panjang — dua ratus nama pada perusahaan seukuran ini — diberi kotak
 * pencarian. Tanpa itu, memilih satu orang berarti menggulir melewati seratus
 * nama lain, dan penyaringnya tidak akan dipakai siapa pun.
 */
function PilihBanyak({
  kunci,
  label,
  semua,
  satuan,
  Ikon,
  pilihan,
}: {
  kunci: KunciDaftar;
  label: string;
  semua: string;
  satuan: string;
  Ikon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  pilihan: Pilihan[];
}) {
  const { daftar, atur, alihkan } = usePenyaring();
  const [cari, setCari] = useState('');

  const terpilih = daftar[kunci];

  // Satu pilihan berarti tidak ada yang perlu dipilih.
  if (pilihan.length < 2) return null;

  const ringkasan =
    terpilih.length === 0
      ? semua
      : terpilih.length === 1
        ? (pilihan.find((satu) => satu.nilai === terpilih[0])?.label ?? `1 ${satuan}`)
        : `${terpilih.length} ${satuan}`;

  const kata = cari.trim().toLowerCase();
  const tersaring =
    kata === ''
      ? pilihan
      : pilihan.filter(
          (satu) =>
            satu.label.toLowerCase().includes(kata) ||
            (satu.keterangan ?? '').toLowerCase().includes(kata),
        );

  return (
    <Popover
      label={label}
      ringkasan={ringkasan}
      Ikon={Ikon}
      aktif={terpilih.length > 0}
      lebar="w-64"
    >
      {pilihan.length > AMBANG_CARI && (
        <div className="relative mb-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="search"
            value={cari}
            onChange={(peristiwa) => setCari(peristiwa.target.value)}
            aria-label={`Cari ${satuan}`}
            placeholder="Cari…"
            className="field field-sm pl-7"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => atur(kunci, [])}
        className={cn(
          'flex w-full items-center justify-between rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
          terpilih.length === 0
            ? 'bg-primary-subtle font-medium text-primary-text'
            : 'text-ink-muted hover:bg-surface-muted',
        )}
      >
        {semua}
        {terpilih.length === 0 && <Check aria-hidden="true" className="size-3.5" />}
      </button>

      {/*
        Daftarnya menggulir di dalam dirinya sendiri. Dua puluh baris yang
        ditampilkan sekaligus membuat popover lebih tinggi dari layar.
      */}
      <ul className="mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t border-line pt-1">
        {tersaring.map((satu) => {
          const aktif = terpilih.includes(satu.nilai);

          return (
            <li key={satu.nilai}>
              <button
                type="button"
                onClick={() => alihkan(kunci, satu.nilai)}
                aria-pressed={aktif}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast',
                  aktif
                    ? 'bg-primary-subtle font-medium text-primary-text'
                    : 'text-ink-muted hover:bg-surface-muted',
                )}
              >
                <span className="min-w-0">
                  <span className="block break-words">{satu.label}</span>
                  {satu.keterangan && (
                    <span className="block text-caption font-normal text-ink-soft">
                      {satu.keterangan}
                    </span>
                  )}
                </span>
                {aktif && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
              </button>
            </li>
          );
        })}

        {tersaring.length === 0 && (
          <li className="px-2 py-2 text-body text-ink-soft">Tidak ada yang cocok.</li>
        )}
      </ul>
    </Popover>
  );
}
