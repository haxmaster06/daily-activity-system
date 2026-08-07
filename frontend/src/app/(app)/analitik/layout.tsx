import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { ambilOpsiAnalitik } from '@/lib/analitik-server';
import { wajibAkses } from '@/lib/session';
import { PemantauSiaran } from '@/components/layout/pemantau-siaran';
import { PenyaringAnalitik } from './penyaring';
import { TabAnalitik } from './tab';

export const metadata = { title: 'Executive Analytics — DAMS' };

/**
 * Kerangka Executive Analytics: judul, tab, dan penyaring bersama.
 *
 * Empat halaman berbagi kerangka ini supaya penyaringnya tidak perlu diisi
 * ulang tiap berpindah tab — nilainya tersimpan di URL dan ikut terbawa.
 */
export default async function AnalitikLayout({ children }: { children: ReactNode }) {
  await wajibAkses('/analitik');

  const opsi = await ambilOpsiAnalitik();

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Executive Analytics' }]} />
      <PageHeader
        judul="Executive Analytics"
        keterangan="Ringkasan progres dan isi laporan pada seluruh jangkauan data Anda."
      />

      <TabAnalitik />

      {/*
        Pilihan yang ditawarkan sudah dibatasi jangkauan di server — termasuk
        daftar namanya, yang merupakan jalur kebocoran tersendiri. Backend tetap
        membuang departemen di luar jangkauan bila diminta lewat URL; daftar ini
        kenyamanan, bukan penjagaan.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PenyaringAnalitik opsi={opsi} />

        {/*
          Halaman ini menunggu kabar, bukan menghitung ulang berkala. Laporan
          yang baru masuk mengubah angkanya tanpa siapa pun menekan muat ulang —
          dan itu satu-satunya cara papan yang dibiarkan terbuka di layar besar
          tetap benar sepanjang hari.
        */}
        <PemantauSiaran departemenId={opsi.departemen.map((satu) => satu.id)} />
      </div>

      <div className="mt-3">{children}</div>
    </>
  );
}
