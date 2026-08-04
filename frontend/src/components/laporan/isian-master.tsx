'use client';

import { useEffect, useRef, useState } from 'react';

import { Combobox, type OpsiCombobox } from '@/components/ui/combobox';
import type { KolomTemplate, NilaiMaster } from '@/lib/template';

interface Props {
  id: string;
  kolom: KolomTemplate;
  nilai: NilaiMaster | null;
  onUbah: (nilai: NilaiMaster | null) => void;
  /** Kode induk yang sedang dipilih, bila kolom ini disaring kolom lain. */
  indukKode: string | null;
  bermasalah?: boolean;
}

const JEDA_KETIK = 250;

/**
 * Isian yang mengambil pilihannya dari daftar master.
 *
 * Pencarian dikerjakan server: daftar LOT dapat berisi ribuan baris, dan
 * memuatnya seluruhnya ke peramban melanggar non-fungsional §15.3. Ketikan
 * ditahan sebentar sebelum dikirim supaya satu kata tidak menjadi lima
 * permintaan.
 *
 * Bila kolom ini disaring kolom lain — LOT yang mengikuti Supplier — kode
 * induknya ikut dikirim. Selama induknya belum dipilih, isian ini dikunci:
 * menawarkan seluruh LOT dari semua supplier justru mengembalikan masalah yang
 * hendak diselesaikan penyaringan itu.
 */
export function IsianMaster({ id, kolom, nilai, onUbah, indukKode, bermasalah }: Props) {
  const [opsi, setOpsi] = useState<OpsiCombobox[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [ketikan, setKetikan] = useState('');

  const slug = kolom.master_jenis?.slug ?? null;
  const butuhInduk = kolom.master_induk_kunci !== null && kolom.master_induk_kunci !== '';
  const terkunci = butuhInduk && (indukKode === null || indukKode === '');

  // Permintaan yang sudah tidak relevan diabaikan hasilnya — tanpa ini,
  // jawaban lambat dari ketikan lama dapat menimpa hasil ketikan baru.
  const nomorPermintaan = useRef(0);

  useEffect(() => {
    if (slug === null || terkunci) {
      setOpsi([]);

      return;
    }

    const nomor = ++nomorPermintaan.current;
    const jeda = setTimeout(() => {
      const query = new URLSearchParams();
      if (ketikan.trim() !== '') query.set('q', ketikan.trim());
      if (indukKode) query.set('induk_kode', indukKode);

      setMemuat(true);

      fetch(`/api/master/${slug}/cari?${query.toString()}`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((hasil: { data?: { id: number; kode: string; nama: string }[] }) => {
          if (nomor !== nomorPermintaan.current) return;

          setOpsi(
            (hasil.data ?? []).map((satu) => ({
              id: satu.kode,
              label: satu.nama,
              keterangan: satu.kode,
            })),
          );
        })
        .catch(() => {
          if (nomor === nomorPermintaan.current) setOpsi([]);
        })
        .finally(() => {
          if (nomor === nomorPermintaan.current) setMemuat(false);
        });
    }, JEDA_KETIK);

    return () => clearTimeout(jeda);
  }, [slug, ketikan, indukKode, terkunci]);

  /*
   * Nilai terpilih selalu ikut disertakan meski tidak ada pada hasil pencarian
   * terakhir. Tanpa ini, isian yang sudah terisi tampak kosong begitu daftar
   * dimuat ulang.
   */
  const daftar =
    nilai !== null && !opsi.some((satu) => satu.id === nilai.kode)
      ? [{ id: nilai.kode, label: nilai.nama, keterangan: nilai.kode }, ...opsi]
      : opsi;

  return (
    <Combobox
      label={kolom.label}
      tanpaLabel
      ukuran="sm"
      opsi={daftar}
      nilai={nilai === null ? null : { id: nilai.kode, label: nilai.nama }}
      onUbah={(dipilih) =>
        onUbah(dipilih === null ? null : { kode: String(dipilih.id), nama: dipilih.label })
      }
      onKetik={setKetikan}
      memuat={memuat}
      nonaktif={terkunci}
      placeholder={terkunci ? 'Pilih induknya dulu' : (kolom.placeholder ?? 'Cari...')}
      galat={bermasalah ? ' ' : undefined}
      key={id}
    />
  );
}
