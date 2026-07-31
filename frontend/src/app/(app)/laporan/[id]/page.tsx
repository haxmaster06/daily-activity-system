import { notFound, redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { TabelIsian } from '@/components/laporan/tabel-isian';
import { PillNav, type ItemTab } from '@/components/ui/pill-nav';
import { StatusBadge } from '@/components/ui/status-badge';
import { GalatApi } from '@/lib/api';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { ambilLaporan } from '@/lib/laporan-server';
import { RAGAM_STATUS } from '@/lib/laporan';
import { penggunaSaatIni } from '@/lib/session';
import { TindakanLaporan } from './tindakan-laporan';

export const metadata = { title: 'Detail Laporan — DAMS' };

export default async function DetailLaporanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect('/api/auth/sesi-berakhir');

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
    pengguna.role !== 'staff';

  const keterangan = [
    { label: 'Penyusun', nilai: laporan.penyusun?.nama ?? '—' },
    { label: 'Departemen', nilai: laporan.departemen?.nama ?? '—' },
    { label: 'Dikirim', nilai: formatTanggalWaktu(laporan.dikirim_pada) },
    { label: 'Ditinjau', nilai: formatTanggalWaktu(laporan.ditinjau_pada) },
    { label: 'Peninjau', nilai: laporan.peninjau?.nama ?? '—' },
  ];

  const bagian = laporan.bagian ?? [];

  const tab: ItemTab[] = bagian.map((item) => ({
    nilai: item.template.kode.toLowerCase(),
    label: item.template.nama,
    jumlah: item.baris.length,
    isi: (
      <TabelIsian
        kolom={item.template.kolom}
        baris={item.baris.map((b) => b.nilai)}
        terkunci
      />
    ),
  }));

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

      {bagian.length === 0 ? (
        <p className="card p-8 text-center text-body-lg text-ink-soft">
          Laporan ini belum punya isi.
        </p>
      ) : (
        <PillNav item={tab} kunciUrl="bagian" />
      )}
    </>
  );
}
