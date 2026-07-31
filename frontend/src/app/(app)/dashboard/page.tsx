import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarCheck, CalendarRange, ClipboardList, Plus, UserX } from 'lucide-react';

import { KartuStatistik } from '@/components/dashboard/kartu-statistik';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatAngka, formatTanggal, formatTanggalLengkap } from '@/lib/format';
import { RAGAM_STATUS } from '@/lib/laporan';
import { ambilRingkasanDashboard } from '@/lib/ringkasan-server';
import { penggunaSaatIni } from '@/lib/session';

export const metadata = { title: 'Dashboard — DAMS' };

export default async function DashboardPage() {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect('/api/auth/sesi-berakhir');

  const ringkasan = await ambilRingkasanDashboard();
  const { kartu, laporan_saya_hari_ini: laporanSaya } = ringkasan;

  const totalAktivitas = ringkasan.status_aktivitas.reduce((n, s) => n + s.jumlah, 0);
  const melihatTim = ringkasan.belum_lapor !== null;

  return (
    <>
      <PageHeader judul={`Selamat datang, ${pengguna.nama.split(' ')[0]}`} />
      <p className="-mt-2 mb-4 text-body-lg text-ink-muted">
        {formatTanggalLengkap(new Date())}
      </p>

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
                <p className="mt-0.5 text-body text-ink-muted">
                  {laporanSaya.dapat_disunting
                    ? 'Masih berupa draf — kirim bila sudah selesai.'
                    : 'Sudah dikirim dan tidak dapat disunting lagi.'}
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
            {formatAngka(ringkasan.belum_lapor!.length)} anggota belum membuat laporan.
          </p>

          <ul className="flex flex-wrap gap-1.5">
            {ringkasan.belum_lapor!.map((item) => (
              <li
                key={item.id}
                className="rounded-control bg-surface-muted px-2 py-1 text-body text-ink-muted"
              >
                {item.nama}
                <span className="ml-1.5 text-caption text-ink-soft">{item.departemen}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
