import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarCheck, CalendarRange, ClipboardList, Plus, UserX } from 'lucide-react';

import { KartuStatistik } from '@/components/dashboard/kartu-statistik';
import { PageHeader } from '@/components/layout/page-header';
import { PemantauSiaran } from '@/components/layout/pemantau-siaran';
import { StatusBadge } from '@/components/ui/status-badge';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { formatAngka, formatTanggal, formatTanggalLengkap } from '@/lib/format';
import { RAGAM_STATUS } from '@/lib/laporan';
import { ambilRingkasanDashboard } from '@/lib/ringkasan-server';
import { penggunaSaatIni } from '@/lib/session';

export const metadata = { title: 'Dashboard — DAMS' };

export default async function DashboardPage() {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect(RUTE_SESI_BERAKHIR);

  const ringkasan = await ambilRingkasanDashboard();
  const { kartu, laporan_saya_hari_ini: laporanSaya } = ringkasan;

  const totalAktivitas = ringkasan.status_aktivitas.reduce((n, s) => n + s.jumlah, 0);
  const melihatTim = ringkasan.belum_lapor !== null;

  /*
   * Yang paling banyak tertinggal berada di atas — itu yang menentukan ke mana
   * pengingat dikirim lebih dulu. Departemen dengan jumlah sama diurutkan
   * menurut abjad supaya urutannya tidak berubah-ubah tiap muat ulang.
   */
  const belumLaporPerDepartemen = Object.entries(
    (ringkasan.belum_lapor ?? []).reduce<Record<string, { id: number; nama: string }[]>>(
      (kumpulan, orang) => {
        (kumpulan[orang.departemen] ??= []).push({ id: orang.id, nama: orang.nama });

        return kumpulan;
      },
      {},
    ),
  ).sort(([namaA, a], [namaB, b]) => b.length - a.length || namaA.localeCompare(namaB, 'id'));

  return (
    <>
      <PageHeader judul={`Selamat datang, ${pengguna.nama.split(' ')[0]}`} />
      <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2">
        <p className="text-body-lg text-ink-muted">{formatTanggalLengkap(new Date())}</p>

        {/*
          Dashboard mengikuti perubahan data, sama seperti Analytics.
          Berlangganan pada departemen yang berada dalam jangkauan pengguna —
          otorisasinya per departemen di routes/channels.php, sehingga langganan
          di luar jangkauan ditolak server, bukan disaring di sini.
        */}
        <PemantauSiaran
          departemenId={
            pengguna.jangkauan.departemenId.length > 0
              ? pengguna.jangkauan.departemenId
              : pengguna.departemenId !== null
                ? [pengguna.departemenId]
                : []
          }
        />
      </div>

      {/* Ajakan utama: laporan hari ini sudah dibuat atau belum. */}
      <section className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        {laporanSaya === null ? (
          <>
            <div>
              <p className="font-heading text-section-title text-ink">
                Anda belum membuat laporan hari ini
              </p>
              <p className="mt-0.5 text-body text-ink-muted">
                Isi aktivitas hari ini selagi masih segar diingat.
              </p>
            </div>
            <Link href="/laporan/baru" className="btn-primary btn-sm">
              <Plus aria-hidden="true" className="size-4" />
              Buat Laporan
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <StatusBadge
                status={RAGAM_STATUS[laporanSaya.status]}
                label={laporanSaya.label_status}
              />
              <div>
                <p className="font-heading text-section-title text-ink">
                  Laporan hari ini sudah ada
                </p>
                {/*
                  Berdasarkan status, bukan `dapat_disunting`. Sejak
                  penyuntingan tidak lagi dikunci status, `dapat_disunting`
                  bernilai benar untuk laporan sendiri apa pun statusnya — dan
                  kalimat "masih berupa draf" akan muncul pada laporan yang
                  justru sudah dikirim.
                */}
                <p className="mt-0.5 text-body text-ink-muted">
                  {laporanSaya.status === 'draf'
                    ? 'Masih berupa draf — kirim bila sudah selesai.'
                    : 'Sudah dikirim. Masih dapat diperbaiki bila ada yang keliru.'}
                </p>
              </div>
            </div>
            <Link href={`/laporan/${laporanSaya.id}`} className="btn-ghost btn-sm">
              Buka Laporan
            </Link>
          </>
        )}
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KartuStatistik
          label="Laporan hari ini"
          nilai={kartu.laporan_hari_ini}
          keterangan={melihatTim ? 'dari tim Anda' : 'milik Anda'}
          icon={CalendarCheck}
          href="/laporan"
        />
        <KartuStatistik
          label="Laporan bulan ini"
          nilai={kartu.laporan_bulan_ini}
          keterangan={`sejak ${formatTanggal(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}`}
          icon={CalendarRange}
          href="/laporan"
        />
        <KartuStatistik
          label="Draf belum dikirim"
          nilai={kartu.draf_belum_dikirim}
          keterangan="perlu diselesaikan"
          icon={ClipboardList}
          href="/laporan?status=draf"
          ragam={kartu.draf_belum_dikirim > 0 ? 'perhatian' : 'netral'}
        />
        <KartuStatistik
          label="Menunggu tinjauan"
          nilai={kartu.menunggu_tinjauan}
          keterangan="sudah dikirim, belum ditinjau"
          icon={ClipboardList}
          href="/laporan?status=dikirim"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-heading text-section-title text-ink">Laporan Terbaru</h2>

          {ringkasan.terbaru.length === 0 ? (
            <p className="py-6 text-center text-body-lg text-ink-soft">
              Belum ada laporan yang tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {ringkasan.terbaru.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/laporan/${item.id}`}
                    className="flex items-center justify-between gap-3 py-2 transition-colors duration-fast hover:bg-surface-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-body-lg text-ink">
                        {formatTanggal(item.tanggal)}
                      </span>
                      <span className="block text-caption text-ink-soft">
                        {item.penyusun} · {item.departemen}
                      </span>
                    </span>
                    <StatusBadge
                      status={RAGAM_STATUS[item.status]}
                      label={item.label_status}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-heading text-section-title text-ink">
            Status Aktivitas Bulan Ini
          </h2>

          {totalAktivitas === 0 ? (
            <p className="py-6 text-center text-body-lg text-ink-soft">
              Belum ada aktivitas tercatat bulan ini.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {ringkasan.status_aktivitas.map((item) => {
                const persen = Math.round((item.jumlah / totalAktivitas) * 100);

                return (
                  <li key={item.status}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-caption tabular-nums text-ink-muted">
                        {formatAngka(item.jumlah)} ({persen}%)
                      </span>
                    </div>
                    {/*
                      Bar disertai angka dan persentase — panjang batang saja
                      tidak dapat dibaca orang yang memakai pembaca layar.
                    */}
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {melihatTim && ringkasan.belum_lapor!.length > 0 && (
        <section className="card mt-3 p-4">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-section-title text-ink">
            <UserX aria-hidden="true" className="size-4 text-accent-text" />
            Belum Melapor Hari Ini
          </h2>
          <p className="mb-3 text-body text-ink-muted">
            {formatAngka(ringkasan.belum_lapor!.length)} anggota belum membuat laporan,
            tersebar di {formatAngka(belumLaporPerDepartemen.length)} departemen.
          </p>

          {/*
            Dikelompokkan per departemen, bukan didaftar rata.
            Daftar rata masih terbaca untuk lima nama; pada lima puluh nama dari
            dua belas departemen ia menjadi tembok yang harus dibaca satu per
            satu. Yang dicari pembaca halaman ini bukan "siapa saja", melainkan
            "departemen mana yang paling banyak tertinggal" — maka departemen
            yang menjadi judulnya, dan yang terbanyak berada di atas.

            Tingginya dibatasi dan hanya daftarnya yang menggulir, mengikuti
            aturan yang sama seperti tabel (§6.2).
          */}
          <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {belumLaporPerDepartemen.map(([departemen, orang]) => (
              <li key={departemen}>
                <div className="flex items-baseline gap-2">
                  <span className="text-meta font-semibold uppercase tracking-wide text-primary-text">
                    {departemen}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-caption tabular-nums text-ink-soft">
                    {formatAngka(orang.length)}
                  </span>
                </div>
                {/*
                  Nama dipisah titik tengah, bukan dibungkus keping satu per
                  satu. Keping memberi tiap nama bingkai dan jarak yang sama
                  besar dengan namanya sendiri, dan pada daftar panjang justru
                  bingkainya yang lebih dulu terbaca.
                */}
                <p className="mt-0.5 text-body leading-5 text-ink-muted">
                  {orang.map((satu) => satu.nama).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
