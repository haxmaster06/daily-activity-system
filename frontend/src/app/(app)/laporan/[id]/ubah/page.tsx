import { notFound, redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { GalatApi } from '@/lib/api';
import { formatTanggal } from '@/lib/format';
import { ambilLaporan } from '@/lib/laporan-server';
import { penggunaSaatIni } from '@/lib/session';
import { ambilTemplate } from '@/lib/template-server';
import { FormLaporan } from '../../baru/form-laporan';

export const metadata = { title: 'Sunting Laporan — DAMS' };

export default async function SuntingLaporanPage({
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
    if (galat instanceof GalatApi && (galat.status === 403 || galat.status === 404)) {
      notFound();
    }
    throw galat;
  }

  // Laporan yang sudah dikirim adalah catatan. Server menolaknya juga, tetapi
  // membuka form yang pasti gagal disimpan hanya membuang waktu pengguna.
  if (!laporan.dapat_disunting) {
    redirect(`/laporan/${laporan.id}`);
  }

  const query = new URLSearchParams({ dengan_kolom: '1', hanya_aktif: '1' });
  if (pengguna.departemenId !== null) {
    query.set('departemen_id', String(pengguna.departemenId));
  }

  const template = await ambilTemplate(query);

  /*
   * Bagian yang sudah terisi dipetakan ke bentuk yang dipakai form. Definisi
   * kolomnya diambil dari laporan itu sendiri, bukan dari daftar template
   * terbaru — template boleh saja sudah berubah sejak laporan dibuat.
   */
  const bagianAwal = (laporan.bagian ?? []).map((item) => ({
    template: {
      id: item.template.id,
      kode: item.template.kode,
      nama: item.template.nama,
      keterangan: null,
      aktif: true,
      urutan: item.urutan,
      versi: 1,
      berlaku_umum: false,
      kolom: item.template.kolom,
    },
    baris: item.baris.map((b) => b.nilai),
  }));

  return (
    <>
      <Breadcrumb
        jejak={[
          { label: 'Laporan Saya', href: '/laporan' },
          { label: formatTanggal(laporan.tanggal), href: `/laporan/${laporan.id}` },
          { label: 'Sunting' },
        ]}
      />
      <PageHeader judul={`Sunting Laporan ${formatTanggal(laporan.tanggal)}`} />

      <FormLaporan
        templateTersedia={template}
        laporanId={laporan.id}
        tanggalAwal={laporan.tanggal}
        bagianAwal={bagianAwal}
      />
    </>
  );
}
