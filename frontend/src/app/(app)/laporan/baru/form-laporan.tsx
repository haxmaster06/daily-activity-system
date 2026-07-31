'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Layers, Plus, X } from 'lucide-react';

import { TabelIsian } from '@/components/laporan/tabel-isian';
import { Alert } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { Wizard } from '@/components/ui/wizard';
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
 * Wizard pembuatan laporan harian (standar UI/UX §3).
 *
 * Isiannya berantai: template baru masuk akal dipilih setelah tanggalnya
 * ditentukan, dan tinjauan akhir hanya berguna setelah isinya lengkap. Karena
 * itu wizard, bukan satu halaman panjang.
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
  const [templateDipilih, setTemplateDipilih] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKolom, setGalatKolom] = useState<Record<string, string[]>>({});
  /*
   * Penanda permintaan lompat ke langkah pengisian. Dinaikkan tiap kali server
   * menolak isian, supaya penolakan kedua atas kolom yang sama tetap
   * memindahkan pengguna ke sana.
   */
  const [nonceGalat, setNonceGalat] = useState(0);

  const belumDipakai = templateTersedia.filter(
    (t) => !bagian.some((b) => b.template.id === t.id),
  );

  function tambahBagian() {
    const template = templateTersedia.find((t) => String(t.id) === templateDipilih);
    if (!template) return;

    setBagian([...bagian, { template, baris: [barisKosong(template.kolom ?? [])] }]);
    setTemplateDipilih('');
  }

  function validasiTanggal(): boolean {
    if (!tanggal) {
      setGalat('Tanggal laporan belum dipilih.');
      return false;
    }
    if (tanggal > new Date().toISOString().slice(0, 10)) {
      setGalat('Laporan tidak dapat dibuat untuk tanggal yang belum terjadi.');
      return false;
    }

    setGalat(null);
    return true;
  }

  function validasiIsi(): boolean {
    if (bagian.length === 0) {
      setGalat('Pilih minimal satu template laporan.');
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

      // Galat per kolom berada di langkah pengisian. Membiarkan pengguna di
      // langkah tinjau berarti ia hanya melihat pesan umum.
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
            label: 'Tanggal',
            validasi: validasiTanggal,
            isi: (
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
            ),
          },

          {
            label: 'Isi Laporan',
            validasi: validasiIsi,
            isi: (
              <div className="space-y-4">
                {bagian.length === 0 && (
                  <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-body-lg text-ink-soft">
                    Belum ada bagian. Pilih template di bawah untuk mulai mengisi.
                  </p>
                )}

                {bagian.map((item, index) => (
                  <section key={item.template.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 font-heading text-section-title text-ink">
                        <Layers aria-hidden="true" className="size-4 text-primary-text" />
                        {item.template.nama}
                      </h2>

                      <button
                        type="button"
                        onClick={() => setBagian(bagian.filter((_, i) => i !== index))}
                        aria-label={`Hapus bagian ${item.template.nama}`}
                        className="btn-ghost btn-sm"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                        Hapus Bagian
                      </button>
                    </div>

                    <TabelIsian
                      kolom={item.template.kolom ?? []}
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
                  <div className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-line p-3">
                    <Select
                      id="template-baru"
                      label="Tambah bagian dari template"
                      className="min-w-56 flex-1"
                      placeholder="Pilih template..."
                      nilai={templateDipilih}
                      opsi={belumDipakai.map((t) => ({
                        nilai: String(t.id),
                        label: t.berlaku_umum ? `${t.nama} (umum)` : t.nama,
                      }))}
                      onUbah={setTemplateDipilih}
                    />

                    <button
                      type="button"
                      onClick={tambahBagian}
                      disabled={templateDipilih === ''}
                      className="btn-primary btn-sm"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Tambah
                    </button>
                  </div>
                )}
              </div>
            ),
          },

          {
            label: 'Tinjau',
            isi: (
              <div className="space-y-3">
                <dl className="grid gap-x-6 gap-y-1.5 rounded-card border border-line p-3 sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Tanggal</dt>
                    <dd className="text-body-lg text-ink">{formatTanggal(tanggal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Jumlah bagian</dt>
                    <dd className="text-body-lg text-ink">{bagian.length}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-caption text-ink-soft">Total baris</dt>
                    <dd className="text-body-lg text-ink">
                      {bagian.reduce((jumlah, b) => jumlah + b.baris.length, 0)}
                    </dd>
                  </div>
                </dl>

                {bagian.map((item) => (
                  <section key={item.template.id}>
                    <h2 className="mb-1.5 font-heading text-section-title text-ink">
                      {item.template.nama}
                    </h2>
                    <TabelIsian
                      kolom={item.template.kolom ?? []}
                      baris={item.baris}
                      terkunci
                    />
                  </section>
                ))}

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
