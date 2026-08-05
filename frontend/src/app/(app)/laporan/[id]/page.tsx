import { notFound, redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { GalatApi } from '@/lib/api';
import { RUTE_SESI_BERAKHIR } from '@/lib/auth-cookie';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { ambilLaporan } from '@/lib/laporan-server';
import { RAGAM_STATUS } from '@/lib/laporan';
import { penggunaSaatIni } from '@/lib/session';
import { IsiLaporan } from './isi-laporan';
import { PanelLampiran } from './panel-lampiran';
import { TindakanLaporan } from './tindakan-laporan';

export const metadata = { title: 'Detail Laporan — DAMS' };

export default async function DetailLaporanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect(RUTE_SESI_BERAKHIR);

  const { id } = await params;

  let laporan;
  try {
    laporan = await ambilLaporan(Number(id));
  } catch (galat) {
    // Laporan yang tidak boleh dilihat diperlakukan sama dengan yang tidak
    // ada — keberadaannya pun bukan informasi yang perlu dibocorkan.
    if (galat instanceof GalatApi && (galat.status === 403 || galat.status === 404)) {
      notFound();
    }
    throw galat;
  }

  /*
   * Cerminan DailyReportPolicy::tinjau. Penegakan sesungguhnya ada di server;
   * ini hanya menentukan tombolnya perlu ditampilkan atau tidak.
   */
  const bolehMeninjau =
    laporan.status === 'dikirim' &&
    laporan.penyusun?.id !== pengguna.id &&
    pengguna.izin.includes('laporan.tinjau');

  const keterangan = [
    { label: 'Penyusun', nilai: laporan.penyusun?.nama ?? '—' },
    { label: 'Departemen', nilai: laporan.departemen?.nama ?? '—' },
    { label: 'Dikirim', nilai: formatTanggalWaktu(laporan.dikirim_pada) },
    { label: 'Ditinjau', nilai: formatTanggalWaktu(laporan.ditinjau_pada) },
    { label: 'Peninjau', nilai: laporan.peninjau?.nama ?? '—' },
  ];

  return (
    <>
      <Breadcrumb
        jejak={[
          { label: 'Laporan Saya', href: '/laporan' },
          { label: formatTanggal(laporan.tanggal) },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-page-title text-ink">
            Laporan {formatTanggal(laporan.tanggal)}
          </h1>
          <StatusBadge
            status={RAGAM_STATUS[laporan.status]}
            label={laporan.label_status}
          />
        </div>
      </div>

      <TindakanLaporan laporan={laporan} bolehMeninjau={bolehMeninjau} />

      <section className="card mb-3 p-3">
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {keterangan.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-caption text-ink-soft">{item.label}</dt>
              <dd className="text-body-lg text-ink">{item.nilai}</dd>
            </div>
          ))}
        </dl>

        {laporan.catatan_tinjauan && (
          <p className="mt-3 rounded-input border border-secondary/25 bg-secondary-subtle px-3 py-2 text-body text-secondary-text">
            <span className="font-medium">Catatan peninjau: </span>
            {laporan.catatan_tinjauan}
          </p>
        )}
      </section>

      <PanelLampiran
        laporanId={laporan.id}
        lampiran={laporan.lampiran ?? []}
        /* Pemiliknya boleh menambah, termasuk setelah laporan dikirim: bukti
           fisik kerap baru tersedia belakangan. */
        bolehUnggah={laporan.penyusun?.id === pengguna.id}
        /* Menghapus hanya selagi draf — laporan yang sudah dikirim adalah
           catatan, dan buktinya tidak boleh hilang. */
        bolehHapus={laporan.penyusun?.id === pengguna.id && laporan.dapat_disunting}
      />

      <IsiLaporan laporan={laporan} />
    </>
  );
}
