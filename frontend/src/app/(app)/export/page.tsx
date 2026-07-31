import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { ambilPratinjauExport } from '@/lib/export-server';
import { ambilDepartemen } from '@/lib/master-data';
import { denganPenyaringanAman } from '@/lib/penyaringan';
import { penggunaSaatIni } from '@/lib/session';
import { ambilTemplate } from '@/lib/template-server';
import { PanelExport } from './panel-export';

export const metadata = { title: 'Export Laporan — DAMS' };

interface Params {
  dari?: string;
  sampai?: string;
  status?: string;
  departemen_id?: string;
  template_id?: string;
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) redirect('/api/auth/sesi-berakhir');

  const filter = await searchParams;

  const query = new URLSearchParams();
  for (const kunci of ['dari', 'sampai', 'status', 'departemen_id', 'template_id'] as const) {
    const nilai = filter[kunci];
    if (nilai) query.set(kunci, nilai);
  }

  // Staff hanya melihat laporannya sendiri; filter departemen tidak berguna
  // baginya dan tidak ditampilkan.
  const dapatPilihDepartemen = pengguna.role !== 'staff';

  const [pratinjau, departemen, template] = await Promise.all([
    denganPenyaringanAman(query, ambilPratinjauExport),
    dapatPilihDepartemen ? ambilDepartemen() : Promise.resolve([]),
    ambilTemplate(new URLSearchParams({ hanya_aktif: '1' })),
  ]);

  return (
    <>
      <div className="print:hidden">
        <Breadcrumb jejak={[{ label: 'Export' }]} />
        <PageHeader judul="Export Laporan" />
      </div>

      <PanelExport
        pratinjau={pratinjau.data}
        peringatan={pratinjau.peringatan}
        departemen={departemen}
        template={template}
        dapatPilihDepartemen={dapatPilihDepartemen}
      />
    </>
  );
}
