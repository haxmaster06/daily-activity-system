'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Layers, Plus, X } from 'lucide-react';

import { TabelIsian } from '@/components/laporan/tabel-isian';
import { Alert } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Wizard } from '@/components/ui/wizard';
import { cn } from '@/lib/cn';
import { formatTanggal } from '@/lib/format';
import { barisKosong, type NilaiBaris } from '@/lib/laporan';
import type { Template } from '@/lib/template';
import { perbaruiLaporan, simpanLaporanBaru, type KiriBagian } from '../actions';

interface BagianTerisi {
  template: Template;
  baris: NilaiBaris[];
}

interface FormLaporanProps {
  /** Template yang boleh dipakai pengguna: miliknya dan yang berlaku umum. */
  templateTersedia: Template[];
  /** Diisi bila sedang menyunting draf yang sudah ada. */
  laporanId?: number;
  tanggalAwal?: string;
  bagianAwal?: BagianTerisi[];
}

/**
 * Template yang dipasang lebih dulu saat halaman dibuka.
 *
 * Yang khas departemennya didahulukan daripada yang berlaku umum: orang yang
 * membuka halaman ini hampir selalu hendak mengisi lembar departemennya
 * sendiri. Bila tidak ada, template umum yang dipakai.
 */
function templateUtama(daftar: Template[]): Template | undefined {
  return daftar.find((satu) => !satu.berlaku_umum) ?? daftar[0];
}

/**
 * Pembuatan laporan harian — dua langkah (standar UI/UX §3).
 *
 * Langkah pertama menentukan tanggal dan lembar mana yang diisi; langkah kedua
 * mengisi sekaligus meninjau sebelum menyimpan.
 *
 * Dulu tiga langkah, dengan satu langkah khusus untuk satu isian tanggal.
 * Untuk pekerjaan yang diulang tiap hari, langkah tambahan itu hanya menambah
 * klik tanpa menambah kejelasan — dan meninjau di halaman terpisah membuat
 * pengguna bolak-balik hanya untuk memperbaiki satu sel.
 */
export function FormLaporan({
  templateTersedia,
  laporanId,
  tanggalAwal,
  bagianAwal,
}: FormLaporanProps) {
  const router = useRouter();
  const sedangUbah = laporanId !== undefined;

  const [tanggal, setTanggal] = useState<string | null>(
    tanggalAwal ?? new Date().toISOString().slice(0, 10),
  );
  const [bagian, setBagian] = useState<BagianTerisi[]>(bagianAwal ?? []);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  /*
   * Penanda permintaan lompat ke langkah pengisian. Dinaikkan tiap kali server
   * menolak isian, supaya penolakan kedua atas kolom yang sama tetap
   * memindahkan pengguna ke sana.
   */
  const [nonceGalat, setNonceGalat] = useState(0);

  /*
   * Lembar utama terpasang sendiri pada laporan baru, sehingga pengguna
   * langsung dapat mengetik. Yang tidak memakainya tinggal melepasnya —
   * lebih cepat daripada memilihnya dari nol setiap hari.
   */
  useEffect(() => {
    if (sedangUbah || bagianAwal !== undefined) return;

    const utama = templateUtama(templateTersedia);
    if (!utama) return;

    setBagian((sebelumnya) =>
      sebelumnya.length > 0
        ? sebelumnya
        : [{ template: utama, baris: [barisKosong(utama.kolom ?? [])] }],
    );
  }, [sedangUbah, bagianAwal, templateTersedia]);

  const belumDipakai = templateTersedia.filter(
    (t) => !bagian.some((b) => b.template.id === t.id),
  );

  function alihkanTemplate(template: Template) {
    const sudahAda = bagian.some((b) => b.template.id === template.id);

    setBagian(
      sudahAda
        ? bagian.filter((b) => b.template.id !== template.id)
        : [...bagian, { template, baris: [barisKosong(template.kolom ?? [])] }],
    );
  }

  function validasiAwal(): boolean {
    if (!tanggal) {
      setGalat('Tanggal laporan belum dipilih.');

      return false;
    }

    if (tanggal > new Date().toISOString().slice(0, 10)) {
      setGalat('Laporan tidak dapat dibuat untuk tanggal yang belum terjadi.');

      return false;
    }

    if (bagian.length === 0) {
      setGalat('Pilih minimal satu lembar laporan.');

      return false;
    }

    setGalat(null);

    return true;
  }

  async function simpan() {
    setGalat(null);
    setGalatKolom({});

    const muatan = {
      report_date: tanggal!,
      sections: bagian.map<KiriBagian>((b) => ({
        report_template_id: b.template.id,
        items: b.baris,
      })),
    };

    const hasil = sedangUbah
      ? await perbaruiLaporan(laporanId, muatan)
      : await simpanLaporanBaru(muatan);

    if (!hasil.berhasil) {
      setGalat(hasil.pesan);
      setGalatKolom(hasil.errors ?? {});

      // Galat per kolom berada di langkah pengisian.
      const adaGalatKolom = Object.keys(hasil.errors ?? {}).some((k) =>
        k.startsWith('sections.'),
      );
      if (adaGalatKolom) setNonceGalat((n) => n + 1);

      return;
    }

    const tujuan = sedangUbah ? laporanId : (hasil as { id?: number }).id;
    router.push(tujuan ? `/laporan/${tujuan}` : '/laporan');
    router.refresh();
  }

  const totalBaris = bagian.reduce((jumlah, b) => jumlah + b.baris.length, 0);

  return (
    <>
      {galat && <Alert jenis="galat" pesan={galat} className="mb-3" />}

      <Wizard
        lompatKe={{ langkah: 1, nonce: nonceGalat }}
        onBatal={() => router.push('/laporan')}
        onSelesai={simpan}
        labelSelesai={sedangUbah ? 'Simpan Perubahan' : 'Simpan Draf'}
        langkah={[
          {
            label: 'Tanggal & Lembar',
            validasi: validasiAwal,
            isi: (
              <div className="space-y-4">
                <div className="max-w-xs">
                  <DatePicker
                    label="Tanggal Laporan"
                    nilai={tanggal}
                    onUbah={setTanggal}
                    wajib
                    nonaktif={sedangUbah}
                    maksimal={new Date().toISOString().slice(0, 10)}
                    bantuan={
                      sedangUbah
                        ? 'Tanggal tidak dapat diubah — laporan tanggal lain adalah laporan yang berbeda.'
                        : 'Satu laporan untuk satu tanggal.'
                    }
                  />
                </div>

                <div>
                  <p className="field-label">Lembar yang diisi</p>

                  {templateTersedia.length === 0 ? (
                    <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-body text-ink-soft">
                      Departemen Anda belum punya template laporan. Hubungi administrator.
                    </p>
                  ) : (
                    <>
                      {/*
                        Sekali klik untuk memasang atau melepas — tanpa Select
                        dan tombol Tambah terpisah. Jumlah lembar per departemen
                        belasan, cukup untuk ditampilkan sekaligus.
                      */}
                      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {templateTersedia.map((item) => {
                          const dipakai = bagian.some((b) => b.template.id === item.id);

                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => alihkanTemplate(item)}
                                aria-pressed={dipakai}
                                className={cn(
                                  'flex w-full items-start gap-2.5 rounded-card border p-2.5 text-left transition-colors duration-fast',
                                  dipakai
                                    ? 'border-primary bg-primary-subtle/40'
                                    : 'border-line bg-surface hover:bg-surface-muted',
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-control',
                                    dipakai
                                      ? 'bg-primary text-white'
                                      : 'border border-line text-transparent',
                                  )}
                                >
                                  <Check aria-hidden="true" className="size-3.5" />
                                </span>

                                <span className="min-w-0">
                                  <span className="block text-body-lg text-ink">
                                    {item.nama}
                                  </span>
                                  <span className="block text-caption text-ink-soft">
                                    {item.berlaku_umum
                                      ? 'Berlaku untuk semua departemen'
                                      : (item.departemen?.nama ?? 'Departemen Anda')}
                                    {' · '}
                                    {item.kolom?.length ?? 0} kolom
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      <p className="mt-1.5 text-caption text-ink-soft">
                        Lembar utama sudah dipilihkan. Tambah atau lepas sesuai yang
                        dikerjakan hari ini.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ),
          },

          {
            label: 'Isi & Kirim',
            isi: (
              <div className="space-y-4">
                {/*
                  Ringkasan di atas isian, bukan di halaman tersendiri:
                  memperbaiki satu sel setelah melihat ringkasan tidak lagi
                  menuntut mundur satu langkah.
                */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-card border border-line px-3 py-2 text-body">
                  <span className="text-ink-muted">
                    Tanggal{' '}
                    <span className="font-medium text-ink">{formatTanggal(tanggal)}</span>
                  </span>
                  <span className="text-ink-muted">
                    Lembar <span className="font-medium text-ink">{bagian.length}</span>
                  </span>
                  <span className="text-ink-muted">
                    Baris <span className="font-medium text-ink">{totalBaris}</span>
                  </span>
                </div>

                {bagian.map((item, index) => (
                  <section key={item.template.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h2 className="flex min-w-0 items-center gap-2 font-heading text-section-title text-ink">
                        <Layers aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
                        {item.template.nama}
                      </h2>

                      <button
                        type="button"
                        onClick={() => setBagian(bagian.filter((_, i) => i !== index))}
                        aria-label={`Lepas lembar ${item.template.nama}`}
                        title="Lepas lembar ini"
                        className="btn-ghost btn-sm shrink-0"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                        Lepas
                      </button>
                    </div>

                    <TabelIsian
                      kolom={item.template.kolom ?? []}
                      bentukBawaan={item.template.bentuk_pengisian}
                      baris={item.baris}
                      onUbah={(baris) =>
                        setBagian(bagian.map((b, i) => (i === index ? { ...b, baris } : b)))
                      }
                      galat={galatKolom}
                      awalanGalat={`sections.${index}.items`}
                    />
                  </section>
                ))}

                {belumDipakai.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-line p-2.5">
                    <span className="text-caption text-ink-soft">Tambah lembar:</span>

                    {belumDipakai.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => alihkanTemplate(item)}
                        className="btn-ghost btn-sm"
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                        {item.nama}
                      </button>
                    ))}
                  </div>
                )}

                <p className="flex items-start gap-2 rounded-input bg-surface-muted px-3 py-2 text-body text-ink-muted">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-secondary-text" />
                  Laporan disimpan sebagai draf dan masih dapat disunting. Kirim laporan dari
                  halaman detailnya bila sudah selesai.
                </p>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
